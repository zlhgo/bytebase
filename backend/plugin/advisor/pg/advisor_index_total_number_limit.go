package pg

// Framework code is generated by the generator.

import (
	"fmt"
	"sort"

	"github.com/bytebase/bytebase/backend/plugin/advisor"
	"github.com/bytebase/bytebase/backend/plugin/advisor/catalog"
	"github.com/bytebase/bytebase/backend/plugin/advisor/db"
	"github.com/bytebase/bytebase/backend/plugin/parser/sql/ast"
)

var (
	_ advisor.Advisor = (*IndexTotalNumberLimitAdvisor)(nil)
	_ ast.Visitor     = (*indexTotalNumberLimitChecker)(nil)
)

func init() {
	advisor.Register(db.Postgres, advisor.PostgreSQLIndexTotalNumberLimit, &IndexTotalNumberLimitAdvisor{})
}

// IndexTotalNumberLimitAdvisor is the advisor checking for index total number limit.
type IndexTotalNumberLimitAdvisor struct {
}

// Check checks for index total number limit.
func (*IndexTotalNumberLimitAdvisor) Check(ctx advisor.Context, statement string) ([]advisor.Advice, error) {
	stmtList, errAdvice := parseStatement(statement)
	if errAdvice != nil {
		return errAdvice, nil
	}

	level, err := advisor.NewStatusBySQLReviewRuleLevel(ctx.Rule.Level)
	if err != nil {
		return nil, err
	}
	payload, err := advisor.UnmarshalNumberTypeRulePayload(ctx.Rule.Payload)
	if err != nil {
		return nil, err
	}
	checker := &indexTotalNumberLimitChecker{
		level:     level,
		title:     string(ctx.Rule.Type),
		max:       payload.Number,
		catalog:   ctx.Catalog,
		tableLine: make(tableLineMap),
	}

	if checker.catalog.Final.Usable() {
		for _, stmt := range stmtList {
			ast.Walk(checker, stmt)
		}
	}

	return checker.generateAdvice(), nil
}

type tableLine struct {
	schema string
	table  string
	line   int
}

type tableLineMap map[string]tableLine

func (m tableLineMap) set(schema string, table string, line int) {
	if schema == "" {
		schema = "public"
	}
	m[fmt.Sprintf("%q.%q", schema, table)] = tableLine{
		schema: schema,
		table:  table,
		line:   line,
	}
}

type indexTotalNumberLimitChecker struct {
	adviceList []advisor.Advice
	level      advisor.Status
	title      string
	max        int
	catalog    *catalog.Finder
	tableLine  tableLineMap
}

func (checker *indexTotalNumberLimitChecker) generateAdvice() []advisor.Advice {
	var tableList []tableLine
	for _, table := range checker.tableLine {
		tableList = append(tableList, table)
	}
	sort.Slice(tableList, func(i, j int) bool {
		return tableList[i].line < tableList[j].line
	})

	for _, table := range tableList {
		tableInfo := checker.catalog.Final.FindTable(&catalog.TableFind{
			SchemaName: table.schema,
			TableName:  table.table,
		})
		if tableInfo != nil && tableInfo.CountIndex() > checker.max {
			checker.adviceList = append(checker.adviceList, advisor.Advice{
				Status:  checker.level,
				Code:    advisor.IndexCountExceedsLimit,
				Title:   checker.title,
				Content: fmt.Sprintf("The count of index in table %q.%q should be no more than %d, but found %d", table.schema, table.table, checker.max, tableInfo.CountIndex()),
				Line:    table.line,
			})
		}
	}

	if len(checker.adviceList) == 0 {
		checker.adviceList = append(checker.adviceList, advisor.Advice{
			Status:  advisor.Success,
			Code:    advisor.Ok,
			Title:   "OK",
			Content: "",
		})
	}
	return checker.adviceList
}

// Visit implements ast.Visitor interface.
func (checker *indexTotalNumberLimitChecker) Visit(in ast.Node) ast.Visitor {
	switch node := in.(type) {
	case *ast.CreateTableStmt:
		checker.tableLine.set(node.Name.Schema, node.Name.Name, node.LastLine())
	case *ast.AlterTableStmt:
		for _, item := range node.AlterItemList {
			switch itemNode := item.(type) {
			case *ast.AddColumnListStmt:
				for _, column := range itemNode.ColumnList {
					if createIndex(column) {
						checker.tableLine.set(node.Table.Schema, node.Table.Name, node.LastLine())
						break
					}
				}
			case *ast.AddConstraintStmt:
				if createIndex(itemNode.Constraint) {
					checker.tableLine.set(node.Table.Schema, node.Table.Name, node.LastLine())
					break
				}
			}
		}
	case *ast.CreateIndexStmt:
		checker.tableLine.set(node.Index.Table.Schema, node.Index.Table.Name, node.LastLine())
	}

	return checker
}

func createIndex(in ast.Node) bool {
	switch node := in.(type) {
	case *ast.ColumnDef:
		for _, constraint := range node.ConstraintList {
			switch constraint.Type {
			case ast.ConstraintTypePrimary, ast.ConstraintTypeUnique:
				return true
			}
		}
	case *ast.ConstraintDef:
		switch node.Type {
		case ast.ConstraintTypePrimary, ast.ConstraintTypeUnique:
			return true
		}
	}
	return false
}
