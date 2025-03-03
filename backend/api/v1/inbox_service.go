package v1

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/bytebase/bytebase/backend/common"
	api "github.com/bytebase/bytebase/backend/legacyapi"
	"github.com/bytebase/bytebase/backend/store"
	v1pb "github.com/bytebase/bytebase/proto/generated-go/v1"
)

// InboxService implements the inbox service.
type InboxService struct {
	v1pb.UnimplementedInboxServiceServer
	store *store.Store
}

// NewInboxService creates a new InboxService.
func NewInboxService(store *store.Store) *InboxService {
	return &InboxService{
		store: store,
	}
}

// ListInbox lists the inbox messages.
func (s *InboxService) ListInbox(ctx context.Context, request *v1pb.ListInboxRequest) (*v1pb.ListInboxResponse, error) {
	filters, err := parseFilter(request.Filter)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, err.Error())
	}

	principalID := ctx.Value(common.PrincipalIDContextKey).(int)
	find := &store.FindInboxMessage{
		ReceiverUID: &principalID,
	}

	for _, spec := range filters {
		switch spec.key {
		case "create_time":
			if spec.operator != comparatorTypeGreaterEqual {
				return nil, status.Errorf(codes.InvalidArgument, `only support ">=" operation for "create_time" filter`)
			}
			t, err := time.Parse(time.RFC3339, spec.value)
			if err != nil {
				return nil, status.Errorf(codes.InvalidArgument, "invalid start_time filter %q", spec.value)
			}
			ts := t.Unix()
			find.ReadCreatedAfterTs = &ts
		default:
			return nil, status.Errorf(codes.InvalidArgument, "unsupport filter %s", spec.key)
		}
	}

	inboxList, err := s.store.FindInbox(ctx, find)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list inbox messages with error: %v", err.Error())
	}

	resp := &v1pb.ListInboxResponse{}
	for _, inbox := range inboxList {
		resp.InboxMessages = append(resp.InboxMessages, convertToInboxMessage(inbox))
	}

	return resp, nil
}

// GetInboxSummary gets the inbox summary.
func (s *InboxService) GetInboxSummary(ctx context.Context, _ *v1pb.GetInboxSummaryRequest) (*v1pb.InboxSummary, error) {
	principalID := ctx.Value(common.PrincipalIDContextKey).(int)
	summary, err := s.store.FindInboxSummary(ctx, principalID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to find inbox summary with error: %v", err.Error())
	}

	return &v1pb.InboxSummary{
		Unread:      int32(summary.Unread),
		UnreadError: int32(summary.UnreadError),
	}, nil
}

// UpdateInbox updates the inbox.
func (s *InboxService) UpdateInbox(ctx context.Context, request *v1pb.UpdateInboxRequest) (*v1pb.InboxMessage, error) {
	if request.InboxMessage == nil {
		return nil, status.Errorf(codes.InvalidArgument, "inbox message must be set")
	}
	if request.UpdateMask == nil {
		return nil, status.Errorf(codes.InvalidArgument, "update_mask must be set")
	}

	inboxUID, err := getUIDFromName(request.InboxMessage.Name, inboxNamePrefix)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, err.Error())
	}

	inboxPatch := &store.UpdateInboxMessage{
		UID: inboxUID,
	}

	for _, path := range request.UpdateMask.Paths {
		switch path {
		case "status":
			inboxStatus, err := converToInboxAPIStatus(request.InboxMessage.Status)
			if err != nil {
				return nil, err
			}
			inboxPatch.Status = inboxStatus
		default:
			return nil, status.Errorf(codes.InvalidArgument, "unsupport update_mask %s", path)
		}
	}

	inbox, err := s.store.PatchInbox(ctx, inboxPatch)
	if err != nil {
		if common.ErrorCode(err) == common.NotFound {
			return nil, status.Errorf(codes.NotFound, "cannot found inbox message %s", request.InboxMessage.Name)
		}
		return nil, status.Errorf(codes.Internal, "failed to update inbox message %s with error: %v", request.InboxMessage.Name, err.Error())
	}

	return convertToInboxMessage(inbox), nil
}

func converToInboxAPIStatus(inboxStatus v1pb.InboxMessage_Status) (api.InboxStatus, error) {
	switch inboxStatus {
	case v1pb.InboxMessage_STATUS_READ:
		return api.Read, nil
	case v1pb.InboxMessage_STATUS_UNREAD:
		return api.Unread, nil
	default:
		return api.Unread, status.Errorf(codes.InvalidArgument, "invalid inbox status %v", inboxStatus)
	}
}

func convertToInboxMessage(inbox *store.InboxMessage) *v1pb.InboxMessage {
	status := v1pb.InboxMessage_STATUS_UNSPECIFIED
	switch inbox.Status {
	case api.Unread:
		status = v1pb.InboxMessage_STATUS_UNREAD
	case api.Read:
		status = v1pb.InboxMessage_STATUS_READ
	}
	return &v1pb.InboxMessage{
		Name:        fmt.Sprintf("%s%d", inboxNamePrefix, inbox.UID),
		ActivityUid: fmt.Sprintf("%d", inbox.ActivityUID),
		Status:      status,
	}
}
