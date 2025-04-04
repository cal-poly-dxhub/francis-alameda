/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { InfiniteData, UseQueryResult, useQueryClient } from '@tanstack/react-query';
import produce from 'immer';
import { last, set } from 'lodash';
import { useIsAdmin } from '../Auth';
import {
  ChatMessageSource,
  CreateChatResponseContent,
  ListChatMessageSourcesResponseContent,
  ListChatMessagesRequest,
  ListChatMessagesResponseContent,
  ListChatsResponseContent,
  useListChatMessages as _useListChatMessages,
  useListChats as _useListChats,
  useCreateChat,
  useCreateChatMessage,
  useDeleteChat,
  useDeleteChatMessage,
  useListChatMessageSources,
  useUpdateChat,
  useUpdateFeedback as _useUpdateFeedback,
  useLoadExemptionTree as _useLoadExemptionTree,
  useCloseExemption as _useCloseExemption,
  useDownloadFeedback as _useDownloadFeedback,
} from '../react-query-hooks';

type PaginatedListChatMessagesResponse = InfiniteData<ListChatMessagesResponseContent>;

export const CHAT_MESSAGE_PARAMS: Partial<ListChatMessagesRequest> = {
  ascending: true,
  reverse: false,
  pageSize: 40,
};

export const queryKeyGenerators = {
  listChats: () => ['listChats'],
  getAllDataForChat: (chatId: string) => ['chat', chatId],
  listChatMessages: (chatId: string) => ['listChatMessages', { ...CHAT_MESSAGE_PARAMS, chatId }],
  // TODO refactor out all prebuilt hooks to imporve query keys
  listChatMessageSources: (chatId: string, messageId: string) => ['listChatMessageSources', { chatId, messageId }],
};

export function useListChats(): ReturnType<typeof _useListChats> {
  return _useListChats({
    select: (chatsResponse: ListChatsResponseContent): ListChatsResponseContent => {
      return produce(chatsResponse, (chats) => {
        chats.chats?.sort(
          (a, b) => (b.createdAt ?? Number.POSITIVE_INFINITY) - (a.createdAt ?? Number.NEGATIVE_INFINITY),
        );
        return chats;
      });
    },
  });
}

export function useDownloadFeedbackReport() {
  const downloadFeedback = _useDownloadFeedback({
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const currentDate = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `user_feedback_${currentDate}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
  return downloadFeedback;
}

export function useCreateChatMutation(
  onCreate?: (response: CreateChatResponseContent) => void,
): ReturnType<typeof useCreateChat> {
  const queryClient = useQueryClient();

  const listChatsQueryKey = queryKeyGenerators.listChats();

  const createChat = useCreateChat({
    onSuccess: (response) => {
      queryClient.setQueryData(listChatsQueryKey, (old: ListChatsResponseContent | undefined) => {
        return {
          ...old,
          chats: [response, ...(old?.chats ?? [])],
        };
      });

      // Since we just created the chat, there will be no messages so don't do a fetch
      const listChatMessagesQueryKey = queryKeyGenerators.listChatMessages(response.chatId);

      queryClient.setQueryData(
        listChatMessagesQueryKey,
        (_old: PaginatedListChatMessagesResponse | undefined): PaginatedListChatMessagesResponse => {
          return {
            pages: [{ chatMessages: [] }],
            pageParams: [null],
          };
        },
      );

      if (onCreate) {
        onCreate(response);
      }
    },
  });
  return createChat;
}

export function useListChatMessages(
  ...args: Parameters<typeof _useListChatMessages>
): ReturnType<typeof _useListChatMessages> {
  return _useListChatMessages(
    {
      ...CHAT_MESSAGE_PARAMS,
      ...args[0],
    },
    args[1],
  );
}

export function useCreateChatMessageMutation(
  chatId: string,
  onSuccess?: () => void,
): ReturnType<typeof useCreateChatMessage> {
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  const listChatMessagesQueryKey = queryKeyGenerators.listChatMessages(chatId);

  const createChatMessage = useCreateChatMessage({
    onSuccess: (questionResponse, _vars) => {
      const { question, answer, sources, traceData } = questionResponse;

      // TODO: until we persist the traceData, just adding to answer message for discoverability
      if (isAdmin && traceData) {
        set(answer, 'traceData', traceData);
      }

      // add both the question and answer to the list of chats in the
      // listChatMessages query cache
      queryClient.setQueryData(listChatMessagesQueryKey, (old: PaginatedListChatMessagesResponse | undefined) => {
        return produce(old, (draft) => {
          if (question && answer) {
            const lastPage: ListChatMessagesResponseContent | undefined = last(draft?.pages || []) as any;

            if (lastPage) {
              const chatMessages = lastPage.chatMessages;

              if (chatMessages == null) {
                // unable to inject new chat messages, just reset to resolve
                console.warn('Failed to inject new chat turn into query cache');
                queryClient
                  .resetQueries({
                    queryKey: [listChatMessagesQueryKey],
                  })
                  .catch(console.error);
              } else {
                chatMessages.push(question, answer);
              }
            } else {
              // this is the first message
              return {
                pages: [
                  {
                    chatMessages: [question, answer],
                  },
                ],
                pageParams: [null],
              } as PaginatedListChatMessagesResponse;
            }

            onSuccess && onSuccess();
          }
          return draft;
        });
      });

      // add the sources for the answer to the listChatMessageSources query cache
      const listChatMessageSourcesQueryKey = queryKeyGenerators.listChatMessageSources(chatId, answer.messageId);
      queryClient.setQueryData(listChatMessageSourcesQueryKey, (): ListChatMessageSourcesResponseContent => {
        return {
          chatMessageSources: sources,
        };
      });
    },
    mutationKey: ['createChatMessage', chatId],
  });

  return createChatMessage;
}

export function useUpdateChatMutation(): ReturnType<typeof useUpdateChat> {
  const queryClient = useQueryClient();

  const listChatsQueryKey = queryKeyGenerators.listChats();

  const updateChat = useUpdateChat({
    onMutate: async (newChat) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: listChatsQueryKey });

      // Snapshot the previous value
      const previousListChat = queryClient.getQueryData(listChatsQueryKey) as ListChatsResponseContent;

      const newListChats = produce(previousListChat, (listChatDraft) => {
        const chats = listChatDraft.chats || [];
        chats.map((chat) => {
          if (chat.chatId === newChat.chatId) {
            chat.title = newChat.updateChatRequestContent.title;
          }
          return chat;
        });
        listChatDraft.chats = chats;
      });

      // Optimistically update to the new value
      queryClient.setQueryData(listChatsQueryKey, newListChats);

      // Return a context object with the snapshotted value
      return { previousListChat };
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (_err, _newChat, context) => {
      queryClient.setQueryData(
        listChatsQueryKey,
        (context as { previousListChat: ListChatsResponseContent }).previousListChat,
      );
    },
  });

  return updateChat;
}

export function useDeleteChatMutation(onSuccess: () => void): ReturnType<typeof useDeleteChat> {
  const queryClient = useQueryClient();

  const listChatsQueryKey = queryKeyGenerators.listChats();

  const deleteMutation = useDeleteChat({
    onSuccess(_data, variables, _context) {
      if (onSuccess) {
        onSuccess();
      }

      // delete the chat out of the chat list
      queryClient.setQueryData<ListChatsResponseContent>(listChatsQueryKey, (previousChatsList) => {
        if (previousChatsList) {
          return produce(previousChatsList, (listChatDraft) => {
            const chats = listChatDraft.chats || [];
            listChatDraft.chats = chats.filter((chat) => chat.chatId !== variables.chatId);
            return listChatDraft;
          });
        } else {
          return {
            chats: [],
          };
        }
      });

      // Now remove the chat messages and message sources for that chat
      const allChatData = queryKeyGenerators.getAllDataForChat(variables.chatId);

      queryClient.removeQueries(allChatData);
    },
  });

  return deleteMutation;
}

export function useDeleteChatMessageMutation(onSuccess: () => void): ReturnType<typeof useDeleteChatMessage> {
  const queryClient = useQueryClient();

  const deleteMutation = useDeleteChatMessage({
    onSuccess(_data, variables, _context) {
      if (onSuccess) {
        onSuccess();
      }

      const listChatMessagesQueryKey = queryKeyGenerators.listChatMessages(variables.chatId);

      queryClient.setQueryData<PaginatedListChatMessagesResponse>(listChatMessagesQueryKey, (old) =>
        produce(old, (draft) => {
          if (draft && draft.pages) {
            for (let page of draft.pages) {
              page.chatMessages =
                page.chatMessages?.filter((message) => message.messageId !== variables.messageId) || [];
            }
          }

          return draft;
        }),
      );
    },
  });

  return deleteMutation;
}

export function useMessageSources(chatId: string, messageId: string): UseQueryResult<ChatMessageSource[]> {
  // @ts-expect-error
  return useListChatMessageSources(
    { chatId, messageId },
    {
      select: (data) => {
        if (data.pages && data.pages.length > 0) {
          return data.pages.flatMap((page) => page.chatMessageSources);
        }
        // @ts-ignore
        return data.chatMessageSources || ([] as ChatMessageSource[]);
      },
    },
  );
}

export function useUpdateFeedbackMutation(): ReturnType<typeof _useUpdateFeedback> {
  return _useUpdateFeedback();
}

export function useLoadExemptionTree(
  ...args: Parameters<typeof _useLoadExemptionTree>
): ReturnType<typeof _useLoadExemptionTree> {
  const queryClient = useQueryClient();

  return _useLoadExemptionTree(args[0], {
    onSuccess: (data) => {
      // Invalidate the chat messages query to display an error message
      if (data.decisionTree && JSON.parse(data.decisionTree).error) {
        queryClient
          .invalidateQueries(queryKeyGenerators.listChatMessages(args[0].chatId))
          .then(() => console.log('Invalidated chat messages query'))
          .catch((error) =>
            console.error('Failed to invalidate chat messages query after load exemption tree errored.', error),
          );
      }
    },
  });
}

// TODO: this function is the same as useCreateChatMessageMutation (with different
// input parameters). Consider refactoring?
export function useCloseExemptionMutation(
  chatId: string,
  onSuccess?: () => void,
): ReturnType<typeof _useCloseExemption> {
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  const listChatMessagesQueryKey = queryKeyGenerators.listChatMessages(chatId);

  const closeExemption = _useCloseExemption({
    onSuccess: (response, _vars) => {
      const { question, answer, sources, traceData } = response;

      // No new messages if the exemption was closed without answers
      if (!question || !answer) {
        return;
      }

      if (isAdmin && traceData) {
        set(answer, 'traceData', traceData);
      }

      queryClient.setQueryData(listChatMessagesQueryKey, (old: PaginatedListChatMessagesResponse | undefined) => {
        return produce(old, (draft) => {
          if (question && answer) {
            const lastPage: ListChatMessagesResponseContent | undefined = last(draft?.pages || []) as any;

            if (lastPage) {
              const chatMessages = lastPage.chatMessages;

              if (chatMessages == null) {
                console.warn('Failed to inject new chat turn into query cache');
                queryClient
                  .resetQueries({
                    queryKey: [listChatMessagesQueryKey],
                  })
                  .catch(console.error);
              } else {
                chatMessages.push(question, answer);
              }
            } else {
              return {
                pages: [
                  {
                    chatMessages: [question, answer],
                  },
                ],
                pageParams: [null],
              } as PaginatedListChatMessagesResponse;
            }

            onSuccess && onSuccess();
          }
          return draft;
        });
      });

      // add sources
      const listChatMessageSourcesQueryKey = queryKeyGenerators.listChatMessageSources(chatId, answer.messageId);
      queryClient.setQueryData(listChatMessageSourcesQueryKey, (): ListChatMessageSourcesResponseContent => {
        return {
          chatMessageSources: sources,
        };
      });
    },
    mutationKey: ['closeExemption', chatId],
  });

  return closeExemption;
}
