// Package snowflake is the advisor for snowflake database.
package snowflake

import (
	"fmt"
	"strings"

	"github.com/antlr4-go/antlr/v4"
	parser "github.com/bytebase/snowsql-parser"

	"github.com/bytebase/bytebase/backend/plugin/advisor"
	"github.com/bytebase/bytebase/backend/plugin/advisor/db"
)

var (
	_ advisor.Advisor = (*NamingIdentifierCaseAdvisor)(nil)
)

func init() {
	advisor.Register(db.Snowflake, advisor.SnowflakeIdentifierCase, &NamingIdentifierCaseAdvisor{})
}

// NamingIdentifierCaseAdvisor is the advisor checking for identifier case.
type NamingIdentifierCaseAdvisor struct {
}

// Check checks for identifier case.
func (*NamingIdentifierCaseAdvisor) Check(ctx advisor.Context, statement string) ([]advisor.Advice, error) {
	tree, errAdvice := parseStatement(statement)
	if errAdvice != nil {
		return errAdvice, nil
	}

	level, err := advisor.NewStatusBySQLReviewRuleLevel(ctx.Rule.Level)
	if err != nil {
		return nil, err
	}

	listener := &namingIdentifierCaseChecker{
		level:                    level,
		title:                    string(ctx.Rule.Type),
		currentOriginalTableName: "",
	}

	antlr.ParseTreeWalkerDefault.Walk(listener, tree)

	return listener.generateAdvice()
}

// namingIdentifierCaseChecker is the listener for identifier case.
type namingIdentifierCaseChecker struct {
	*parser.BaseSnowflakeParserListener

	level advisor.Status
	title string

	// currentOriginalTableName is the original table name in the statement.
	currentOriginalTableName string

	adviceList []advisor.Advice
}

// generateAdvice returns the advices generated by the listener, the advices must not be empty.
func (l *namingIdentifierCaseChecker) generateAdvice() ([]advisor.Advice, error) {
	if len(l.adviceList) == 0 {
		l.adviceList = append(l.adviceList, advisor.Advice{
			Status:  advisor.Success,
			Code:    advisor.Ok,
			Title:   "OK",
			Content: "",
		})
	}
	return l.adviceList, nil
}

// EnterCreate_table is called when production create_table is entered.
func (l *namingIdentifierCaseChecker) EnterCreate_table(ctx *parser.Create_tableContext) {
	l.currentOriginalTableName = ctx.Object_name().GetText()
}

// ExitCreate_table is called when production create_table is exited.
func (l *namingIdentifierCaseChecker) ExitCreate_table(*parser.Create_tableContext) {
	l.currentOriginalTableName = ""
}

// EnterCreate_table_as_select is called when production create_table_as_select is entered.
func (l *namingIdentifierCaseChecker) EnterCreate_table_as_select(ctx *parser.Create_table_as_selectContext) {
	l.currentOriginalTableName = ctx.Object_name().GetText()
}

// ExitCreate_table_as_select is called when production create_table_as_select is exited.
func (l *namingIdentifierCaseChecker) ExitCreate_table_as_select(*parser.Create_table_as_selectContext) {
	l.currentOriginalTableName = ""
}

// EnterColumn_decl_item_list is called when production column_decl_item_list is entered.
func (l *namingIdentifierCaseChecker) EnterColumn_decl_item_list(ctx *parser.Column_decl_item_listContext) {
	if l.currentOriginalTableName == "" {
		return
	}

	allItems := ctx.AllColumn_decl_item()
	if len(allItems) == 0 {
		return
	}

	for _, item := range allItems {
		if fullColDecl := item.Full_col_decl(); fullColDecl != nil {
			originalID := fullColDecl.Col_decl().Column_name().Id_()
			originalColName := normalizeObjectNamePart(originalID)
			if strings.ToUpper(originalColName) != originalColName {
				l.adviceList = append(l.adviceList, advisor.Advice{
					Status:  l.level,
					Code:    advisor.NamingCaseMismatch,
					Title:   l.title,
					Content: fmt.Sprintf("Identifier %q should be upper case", originalColName),
					Line:    ctx.GetStart().GetLine(),
				})
			}
		}
	}
}

// EnterAlter_table is called when production alter_table is entered.
func (l *namingIdentifierCaseChecker) EnterAlter_table(ctx *parser.Alter_tableContext) {
	if ctx.Table_column_action() == nil || ctx.Table_column_action().RENAME() == nil {
		return
	}
	l.currentOriginalTableName = ctx.Object_name(0).GetText()
	renameToID := ctx.Table_column_action().Column_name(1).Id_()
	renameToColName := normalizeObjectNamePart(renameToID)
	if strings.ToUpper(renameToColName) != renameToColName {
		l.adviceList = append(l.adviceList, advisor.Advice{
			Status:  l.level,
			Code:    advisor.NamingCaseMismatch,
			Title:   l.title,
			Content: fmt.Sprintf("Identifier %q should be upper case", renameToColName),
			Line:    renameToID.GetStart().GetLine(),
		})
	}
}
