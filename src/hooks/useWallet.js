import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { walletAPI } from '../api/services'

export const useWallet = () => {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletAPI.getWallet(),
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}

export const useWalletTransactions = (params = {}) => {
  return useQuery({
    queryKey: ['wallet-transactions', params],
    queryFn: () => walletAPI.getTransactions(params),
  })
}

export const useAddFunds = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ amount, paymentMethod }) => walletAPI.addFunds(amount, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries(['wallet'])
      queryClient.invalidateQueries(['wallet-transactions'])
    },
  })
}

export const useWalletStats = () => {
  return useQuery({
    queryKey: ['wallet-stats'],
    queryFn: () => walletAPI.getWalletStats(),
  })
}
