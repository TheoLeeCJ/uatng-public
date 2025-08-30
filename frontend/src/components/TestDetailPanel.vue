<template>
  <div class="h-full flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-gray-600 font-medium">Loading test details...</p>
      </div>
    </div>
    
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span class="material-symbols-outlined text-red-600 text-xl">error</span>
        </div>
        <p class="text-red-600 font-medium mb-2">Failed to load test</p>
        <p class="text-gray-500 text-sm">{{ error }}</p>
      </div>
    </div>
    
    <template v-else-if="test">
      <div class="p-4 bg-white border-b border-gray-200 shadow-sm">
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-3">
            <div
              class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span class="material-symbols-outlined text-white text-lg">science</span>
            </div>
            <span class="text-xl font-bold text-gray-800">{{ test.name }}</span>

            <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{{ test.previewType
            }}</span>
            <span :class="'px-2 py-1 rounded-full text-xs font-medium',
              test.state === 'ready' ? 'bg-green-100 text-green-700' :
                test.state === 'running' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
              ">{{ test.state }}</span>
          </div>

          <!-- Tabs -->
          <div class="flex bg-gray-100 rounded-lg p-1">
            <button @click="activeTab = 'info'" :class="{
              'px-4 py-0.5 rounded-md text-sm font-medium transition-all duration-200': true,
              'bg-white text-gray-900 shadow-sm': activeTab === 'info',
              'text-gray-600 hover:text-gray-900': activeTab !== 'info'
            }">
              Info View
            </button>
            <button @click="activeTab = 'test'" :class="{
              'px-4 py-0.5 rounded-md text-sm font-medium transition-all duration-200': true,
              'bg-white text-gray-900 shadow-sm': activeTab === 'test',
              'text-gray-600 hover:text-gray-900': activeTab !== 'test'
            }">
              Test View
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-hidden">
        <InfoView v-if="activeTab === 'info'" :test="test" />
        <TestView v-else-if="activeTab === 'test'" :test="test" @testUpdated="handleTestUpdated" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import InfoView from './InfoView.vue'
import TestView from './TestView.vue'

const props = defineProps(['testId'])
const emit = defineEmits(['testUpdated'])

const { apiCall } = useAuth()

const test = ref(null)
const loading = ref(false)
const error = ref(null)
const activeTab = ref('info')

const loadTestDetails = async () => {
  if (!props.testId) {
    test.value = null
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    const response = await apiCall(`/test/${props.testId}`)
    if (response.ok) {
      test.value = await response.json()
    } else {
      const errorData = await response.json()
      error.value = errorData.error || 'Failed to load test details'
    }
  } catch (err) {
    error.value = err.message || 'Network error'
  }
  
  loading.value = false
}

const handleTestUpdated = () => {
  // Reload test details and notify parent
  loadTestDetails()
  emit('testUpdated')
}

watch(() => props.testId, loadTestDetails, { immediate: true })
</script>