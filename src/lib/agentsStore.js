import { ref } from 'vue'
import { api } from './api.js'

export const agents = ref([])

export async function loadAgents(options = {}) {
  agents.value = await api.getAgents(options)
  return agents.value
}

export async function scanAgents() {
  agents.value = await api.scanAgents()
  return agents.value
}
