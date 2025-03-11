/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import {
  useQuery,
  UseQueryResult,
  UseQueryOptions,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  UseInfiniteQueryOptions,
  useMutation,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useContext } from 'react';
import {
  CreateChatRequest,
  CreateChatMessageRequest,
  DeleteChatRequest,
  DeleteChatMessageRequest,
  ListChatMessageSourcesRequest,
  ListChatMessagesRequest,
  UpdateChatRequest,
  UpdateFeedbackRequest,
  InitiateExemptionRequest,
  TraverseExemptionRequest,
} from './DefaultApi';
import { DefaultApiDefaultContext, DefaultApiClientContext } from './DefaultApiClientProvider';
import type {
  CreateChatMessageResponseContent,
  CreateChatResponseContent,
  DeleteChatMessageResponseContent,
  DeleteChatResponseContent,
  ListChatMessageSourcesResponseContent,
  ListChatMessagesResponseContent,
  ListChatsResponseContent,
  UpdateChatResponseContent,
  UpdateFeedbackResponseContent,
  InitiateExemptionResponseContent,
  TraverseExemptionResponseContent,
} from '../models';

// Import request parameter interfaces

import { ResponseError } from '../runtime';

const NO_API_ERROR = new Error(
  `DefaultApi client missing. Please ensure you have instantiated the DefaultApiClientProvider with a client instance.`,
);

/**
 * useMutation hook for the CreateChat operation
 */
export const useCreateChat = <TError = ResponseError>(
  options?: Omit<UseMutationOptions<CreateChatResponseContent, TError, CreateChatRequest>, 'mutationFn'>,
): UseMutationResult<CreateChatResponseContent, TError, CreateChatRequest> => {
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useMutation((params: CreateChatRequest) => api.createChat(params), {
    context: DefaultApiDefaultContext,
    ...options,
  });
};

/**
 * useMutation hook for the CreateChatMessage operation
 */
export const useCreateChatMessage = <TError = ResponseError>(
  options?: Omit<UseMutationOptions<CreateChatMessageResponseContent, TError, CreateChatMessageRequest>, 'mutationFn'>,
): UseMutationResult<CreateChatMessageResponseContent, TError, CreateChatMessageRequest> => {
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useMutation((params: CreateChatMessageRequest) => api.createChatMessage(params), {
    context: DefaultApiDefaultContext,
    ...options,
  });
};

/**
 * useMutation hook for the DeleteChat operation
 */
export const useDeleteChat = <TError = ResponseError>(
  options?: Omit<UseMutationOptions<DeleteChatResponseContent, TError, DeleteChatRequest>, 'mutationFn'>,
): UseMutationResult<DeleteChatResponseContent, TError, DeleteChatRequest> => {
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useMutation((params: DeleteChatRequest) => api.deleteChat(params), {
    context: DefaultApiDefaultContext,
    ...options,
  });
};

/**
 * useMutation hook for the DeleteChatMessage operation
 */
export const useDeleteChatMessage = <TError = ResponseError>(
  options?: Omit<UseMutationOptions<DeleteChatMessageResponseContent, TError, DeleteChatMessageRequest>, 'mutationFn'>,
): UseMutationResult<DeleteChatMessageResponseContent, TError, DeleteChatMessageRequest> => {
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useMutation((params: DeleteChatMessageRequest) => api.deleteChatMessage(params), {
    context: DefaultApiDefaultContext,
    ...options,
  });
};

/**
 * useInfiniteQuery hook for the ListChatMessageSources operation
 */
export const useListChatMessageSources = <TError = ResponseError>(
  params: ListChatMessageSourcesRequest,
  options?: Omit<
    UseInfiniteQueryOptions<ListChatMessageSourcesResponseContent, TError>,
    'queryKey' | 'queryFn' | 'getNextPageParam'
  >,
): UseInfiniteQueryResult<ListChatMessageSourcesResponseContent, TError> => {
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useInfiniteQuery(
    ['listChatMessageSources', params],
    ({ pageParam }) => api.listChatMessageSources({ ...params, nextToken: pageParam }),
    {
      getNextPageParam: (response) => response.nextToken,
      context: DefaultApiDefaultContext,
      ...(options as any),
    },
  );
};

/**
 * useInfiniteQuery hook for the ListChatMessages operation
 */
export const useListChatMessages = <TError = ResponseError>(
  params: ListChatMessagesRequest,
  options?: Omit<
    UseInfiniteQueryOptions<ListChatMessagesResponseContent, TError>,
    'queryKey' | 'queryFn' | 'getNextPageParam'
  >,
): UseInfiniteQueryResult<ListChatMessagesResponseContent, TError> => {
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useInfiniteQuery(
    ['listChatMessages', params],
    ({ pageParam }) => api.listChatMessages({ ...params, nextToken: pageParam }),
    {
      getNextPageParam: (response) => response.nextToken,
      context: DefaultApiDefaultContext,
      ...(options as any),
    },
  );
};

/**
 * useQuery hook for the ListChats operation
 */
export const useListChats = <TError = ResponseError>(
  options?: Omit<UseQueryOptions<ListChatsResponseContent, TError>, 'queryKey' | 'queryFn'>,
): UseQueryResult<ListChatsResponseContent, TError> => {
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useQuery(['listChats'], () => api.listChats(), {
    context: DefaultApiDefaultContext,
    ...(options as any),
  });
};

/**
 * useMutation hook for the UpdateChat operation
 */
export const useUpdateChat = <TError = ResponseError>(
  options?: Omit<UseMutationOptions<UpdateChatResponseContent, TError, UpdateChatRequest>, 'mutationFn'>,
): UseMutationResult<UpdateChatResponseContent, TError, UpdateChatRequest> => {
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useMutation((params: UpdateChatRequest) => api.updateChat(params), {
    context: DefaultApiDefaultContext,
    ...options,
  });
};

/**
 * useMutation hook for the UpdateFeedback operation
 */
export const useUpdateFeedback = <TError = ResponseError>(
  options?: Omit<UseMutationOptions<UpdateFeedbackResponseContent, TError, UpdateFeedbackRequest>, 'mutationFn'>,
): UseMutationResult<UpdateFeedbackResponseContent, TError, UpdateFeedbackRequest> => {
  // console.log('Running _useUpdateFeedback');
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useMutation((params: UpdateFeedbackRequest) => api.updateFeedback(params), {
    context: DefaultApiDefaultContext,
    ...options,
  });
};

/**
 * useMutation hook for the InitiateExemption operation
 */
export const useInitiateExemption = <TError = ResponseError>(
  options?: Omit<UseMutationOptions<InitiateExemptionResponseContent, TError, InitiateExemptionRequest>, 'mutationFn'>,
): UseMutationResult<InitiateExemptionResponseContent, TError, InitiateExemptionRequest> => {
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useMutation((params: InitiateExemptionRequest) => api.initiateExemption(params), {
    context: DefaultApiDefaultContext,
    ...options,
  });
};

/**
 * useMutation hook for the TraverseExemption operation
 *
 * TODO: can we partially pass some params here?
 */
export const useTraverseExemption = <TError = ResponseError>(
  options?: Omit<UseMutationOptions<TraverseExemptionResponseContent, TError, TraverseExemptionRequest>, 'mutationFn'>,
): UseMutationResult<TraverseExemptionResponseContent, TError, TraverseExemptionRequest> => {
  const api = useContext(DefaultApiClientContext);
  if (!api) {
    throw NO_API_ERROR;
  }
  return useMutation((params: TraverseExemptionRequest) => api.traverseExemption(params), {
    context: DefaultApiDefaultContext,
    ...options,
  });
};
