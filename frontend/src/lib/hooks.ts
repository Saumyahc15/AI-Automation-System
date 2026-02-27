/**
 * Custom hooks for API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './api-client'

// ==================== WORKFLOW HOOKS ====================

/**
 * Hook to fetch all workflows
 */
export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => apiClient.getWorkflows(),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to fetch single workflow
 */
export function useWorkflow(id: number) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => apiClient.getWorkflow(id),
    staleTime: 30000,
  })
}

/**
 * Hook to create workflow
 */
export function useCreateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; description?: string; user_instruction: string }) =>
      apiClient.createWorkflow(data),
    onSuccess: () => {
      // Invalidate and refetch workflows
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

/**
 * Hook to update workflow
 */
export function useUpdateWorkflow(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => apiClient.updateWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow', id] })
    },
  })
}

/**
 * Hook to delete workflow
 */
export function useDeleteWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

/**
 * Hook to execute workflow
 */
export function useExecuteWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.executeWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

/**
 * Hook to activate workflow
 */
export function useActivateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.activateWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

/**
 * Hook to deactivate workflow
 */
export function useDeactivateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.deactivateWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

// ==================== EXECUTION LOG HOOKS ====================

/**
 * Hook to fetch execution logs
 */
export function useLogs() {
  return useQuery({
    queryKey: ['logs'],
    queryFn: () => apiClient.getLogs(),
    staleTime: 15000, // 15 seconds (more frequent updates)
  })
}

/**
 * Hook to fetch logs for specific workflow
 */
export function useWorkflowLogs(workflowId: number) {
  return useQuery({
    queryKey: ['logs', workflowId],
    queryFn: () => apiClient.getWorkflowLogs(workflowId),
    staleTime: 15000,
  })
}

// ==================== AUTH HOOKS ====================

/**
 * Hook to register a new user
 */
export function useRegister() {
  return useMutation({
    mutationFn: (data: {
      email: string
      password: string
      full_name: string
    }) => apiClient.register(data),
  })
}

/**
 * Hook to login user
 */
export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiClient.login(data),
  })
}

/**
 * Hook to get current user
 */
export function useGetCurrentUser(userId: number) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => apiClient.getCurrentUser(userId),
    enabled: !!userId, // Only run if userId exists
  })
}
