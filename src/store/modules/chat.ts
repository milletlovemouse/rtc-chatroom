import { defineStore } from "pinia"
import { store } from '/@/store';

export const useChatStore = defineStore('chat', {
  state: () => ({
    count: 0,
  }),
  getters: {
    
  },
  actions: {
    
  },
})

export function useChatStoreWithOut() {
  return useChatStore(store)
}