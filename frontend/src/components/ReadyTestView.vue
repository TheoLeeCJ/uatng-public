<template>
  <div class="h-full flex bg-white">
    <!-- Left Pane - Takes remaining space -->
    <div class="flex-1 min-w-0 flex flex-col bg-gray-50 border-r border-gray-200 overflow-y-auto p-4 space-y-4">
      <!-- Ready Test Controls -->
      <div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
        <div class="flex items-center space-x-2 mb-3">
          <div class="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
            <span class="material-symbols-outlined text-green-600 text-sm">check_circle</span>
          </div>
          <h3 class="text-base font-bold text-gray-800">Ready to Run</h3>
        </div>
        
        <div class="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div class="text-green-800 mb-2">
            <strong>{{ test.name }}</strong>
          </div>
          <div class="text-sm text-green-700">
            Test configured and ready for execution
          </div>
        </div>
        
        <button
          @click="runTest"
          :disabled="isRunning"
          class="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
        >
          <span class="material-symbols-outlined text-lg">{{ isRunning ? 'hourglass_empty' : 'play_arrow' }}</span>
          <span>{{ isRunning ? 'Starting...' : 'Run Test' }}</span>
        </button>
      </div>

      <!-- Test Run Comparison -->
      <div v-if="showComparison" class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
        <div class="flex items-center space-x-2 mb-3">
          <div class="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
            <span class="material-symbols-outlined text-purple-600 text-sm">compare</span>
          </div>
          <h3 class="text-base font-bold text-gray-800">Test Run Comparison</h3>
        </div>
        
        <div v-if="comparisonLoading || (comparisonResult && comparisonResult.status === 'generating')" class="p-4 rounded-lg border border-blue-200 comparison-loading">
          <div class="flex items-center space-x-3">
            <div class="w-6 h-6 flex items-center justify-center">
              <span class="material-symbols-outlined text-blue-600 text-lg">auto_awesome</span>
            </div>
            <div class="text-blue-800 font-medium">Loading AI test run comparison...</div>
          </div>
        </div>
        
        <div v-else-if="comparisonError || (comparisonResult && comparisonResult.status === 'failed')" class="p-3 bg-red-50 rounded-lg border border-red-200">
          <div class="text-red-800 text-sm">
            Failed to load comparison: {{ comparisonError || comparisonResult?.comparison || 'Unknown error' }}
          </div>
        </div>
        
        <div v-else-if="comparisonResult && comparisonResult.status === 'completed'" class="p-3 rounded-lg border border-gray-200 comparison-completed">
          <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ comparisonResult.comparison }}</div>
          <div class="text-xs text-gray-500 mt-2">
            Comparing {{ formatDate(comparisonResult.previousRunCreatedAt) }} vs {{ formatDate(comparisonResult.latestRunCreatedAt) }}
          </div>
        </div>
      </div>

      <!-- Latest Test Run -->
      <div v-if="latestTestRun" class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
        <div class="flex items-center space-x-2 mb-3">
          <div class="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
            <span class="material-symbols-outlined text-blue-600 text-sm">history</span>
          </div>
          <h3 class="text-base font-bold text-gray-800">Latest Test Run</h3>
          <TestRunStatusBadge :status="latestTestRun.status" />
        </div>
        
        <!-- Steps horizontal scroll -->
        <div v-if="latestTestRun.steps && latestTestRun.steps.length > 0" class="space-y-2">
          <div class="text-sm font-semibold text-gray-500 uppercase">Steps</div>
          <div class="flex space-x-3 overflow-x-auto pb-2">
            <TestRunStep
              v-for="(step, index) in latestTestRun.steps"
              :key="index"
              :step="step"
              :index="index"
              @select="selectScreenshot"
            />
          </div>
        </div>
        
        <div v-else class="text-sm text-gray-500 italic">
          No steps recorded yet
        </div>
      </div>

      <!-- Previous Test Runs -->
      <div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
        <div class="flex items-center space-x-2 mb-3">
          <div class="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
            <span class="material-symbols-outlined text-purple-600 text-sm">list</span>
          </div>
          <h3 class="text-base font-bold text-gray-800">Previous Test Runs</h3>
        </div>
        
        <div v-if="previousTestRuns.length > 0" class="space-y-2">
          <div
            v-for="testRun in previousTestRuns"
            :key="testRun._id"
            class="border border-gray-200 rounded-lg overflow-hidden"
          >
            <div
              @click="toggleTestRunDetails(testRun._id)"
              class="p-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div class="flex items-center space-x-3">
                <span class="text-sm font-medium text-gray-800">
                  {{ new Date(testRun.createdAt).toLocaleString() }}
                </span>
                <TestRunStatusBadge :status="testRun.status" />
                <span v-if="testRun.reason" class="text-sm text-gray-500 truncate max-w-48 font-semibold">
                  {{ testRun.reason.split(":")[0] }}
                </span>
              </div>
              <span class="material-symbols-outlined text-gray-400 text-sm">
                {{ expandedTestRuns.has(testRun._id) ? 'expand_less' : 'expand_more' }}
              </span>
            </div>
            
            <!-- Expanded details -->
            <div v-if="expandedTestRuns.has(testRun._id)" class="border-t border-gray-200 p-3 bg-gray-50">
              <div v-if="testRunDetails[testRun._id]" class="space-y-3">
                <div v-if="testRunDetails[testRun._id].steps && testRunDetails[testRun._id].steps.length > 0">
                  <div class="text-sm font-semibold text-gray-500 uppercase">Steps</div>
                  <div class="flex space-x-3 overflow-x-auto pb-2 mt-2">
                    <TestRunStep
                      v-for="(step, index) in testRunDetails[testRun._id].steps"
                      :key="index"
                      :step="step"
                      :index="index"
                      @select="selectScreenshot"
                    />
                  </div>
                </div>
                <div v-else class="text-sm text-gray-500 italic">
                  No steps recorded
                </div>
              </div>
              <div v-else class="text-sm text-gray-500">
                Loading details...
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-sm text-gray-500 italic">
          No previous test runs
        </div>
      </div>
      
      <!-- Spacer -->
      <div class="flex-1"></div>
    </div>
    
    <!-- Right Side - Screen Display Container -->
    <div class="screen-container bg-black flex items-center justify-center">
      <div v-if="loading && !screenImage && !showMjpegStream" class="text-center">
        <div class="w-12 h-12 border-4 border-gray-600 border-t-gray-300 rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-gray-300 font-medium">Loading screen...</p>
      </div>
      
      <div v-else-if="error && !screenImage && !showMjpegStream" class="text-center">
        <div class="w-12 h-12 bg-red-900 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span class="material-symbols-outlined text-red-400 text-xl">error</span>
        </div>
        <p class="text-red-400 font-medium mb-2">Failed to load screen</p>
        <p class="text-gray-400 text-sm mb-3">{{ error }}</p>
        <button
          @click="captureScreen"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
      
      <!-- MJPEG Stream (when not overridden by screenshot) -->
      <div v-else-if="showMjpegStream" class="screen-wrapper">
        <img
          ref="screenImg"
          :src="mjpegUrl"
          alt="Live Stream"
          class="screen-image"
          @load="onImageLoad"
        />
      </div>
      
      <!-- Screen image container with fixed aspect ratio -->
      <div v-else-if="screenImage" class="screen-wrapper">
        <img
          ref="screenImg"
          :src="screenImage"
          alt="Device Screen"
          class="screen-image"
          @load="onImageLoad"
        />
      </div>
      
      <!-- Default state when no screenshot selected and no MJPEG -->
      <div v-else class="text-center">
        <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span class="material-symbols-outlined text-gray-600 text-xl">play_arrow</span>
        </div>
        <p class="text-white font-medium text-sm mb-1">Test Ready</p>
        <p class="text-gray-300 text-xs">Click "Run Test" to execute or select a step to view</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import TestRunStep from './TestRunStep.vue'
import TestRunStatusBadge from './TestRunStatusBadge.vue'

const props = defineProps(['test'])
const emit = defineEmits(['testUpdated'])

const { apiCall } = useAuth()

const isRunning = ref(false)
const latestTestRun = ref(null)
const previousTestRuns = ref([])
const expandedTestRuns = ref(new Set())
const testRunDetails = ref({})
const selectedScreenshot = ref(null)
const selectedStepVerdict = ref(null)
const loading = ref(false)
const error = ref(null)
let pollingInterval = null

// Comparison state
const comparisonLoading = ref(false)
const comparisonError = ref(null)
const comparisonResult = ref(null)

// MJPEG stream support
const mjpegUrl = ref(localStorage.getItem('mjpegUrl'))
const mjpegOverridden = ref(false)
const showMjpegStream = computed(() => !!mjpegUrl.value && !mjpegOverridden.value && !selectedScreenshot.value)

// Screen image computed property that uses selectedScreenshot or MJPEG
const screenImage = computed(() => {
  if (selectedScreenshot.value) {
    return `data:image/jpeg;base64,${selectedScreenshot.value}`
  }
  return null
})

// Show comparison if we have latest and at least one previous run
const showComparison = computed(() => {
  return latestTestRun.value && previousTestRuns.value.length > 0
})

const loadTestRuns = async () => {
  if (!props.test) return
  
  try {
    const response = await apiCall(`/test/run/list?testId=${props.test._id}`)
    const testRuns = await response.json()
    
    if (testRuns.length > 0) {
      latestTestRun.value = testRuns[0]
      previousTestRuns.value = testRuns.slice(1)
      
      // Load latest test run details
      await loadTestRunDetails(latestTestRun.value._id)
      
      // Don't automatically set screenshot - let MJPEG stream show if available
      // Only set screenshot when user explicitly selects a step

      // Load comparison only if latest test run is completed or quit AND we have previous runs
      if (testRuns.length >= 2 && (latestTestRun.value.status === 'completed' || latestTestRun.value.status === 'quit')) {
        await loadComparison(latestTestRun.value._id, testRuns[1]._id)
      }
    } else {
      latestTestRun.value = null
      previousTestRuns.value = []
    }
  } catch (error) {
    console.error('Failed to load test runs:', error)
  }
}

const loadComparison = async (latestRunId, previousRunId) => {
  comparisonLoading.value = true
  comparisonError.value = null
  comparisonResult.value = null

  try {
    const response = await apiCall('/test/run/compare', {
      method: 'POST',
      body: JSON.stringify({
        firstRunId: previousRunId,
        secondRunId: latestRunId
      })
    })

    if (response.ok) {
      const result = await response.json()
      comparisonResult.value = result
      
      // If still generating, poll for updates
      if (result.status === 'generating') {
        pollComparisonStatus(result._id)
      }
    } else {
      const errorData = await response.json()
      comparisonError.value = errorData.error || 'Failed to load comparison'
    }
  } catch (error) {
    comparisonError.value = error.message || 'Network error'
  } finally {
    comparisonLoading.value = false
  }
}

const pollComparisonStatus = async (comparisonId) => {
  const maxPolls = 20 // Max 2 minutes
  let pollCount = 0
  
  const pollInterval = setInterval(async () => {
    pollCount++
    
    try {
      const response = await apiCall(`/test/run/comparison/${comparisonId}`)
      if (response.ok) {
        const result = await response.json()
        
        if (result.status === 'completed' || result.status === 'failed') {
          comparisonResult.value = result
          clearInterval(pollInterval)
        }
      }
    } catch (error) {
      console.error('Failed to poll comparison status:', error)
    }
    
    if (pollCount >= maxPolls) {
      clearInterval(pollInterval)
      comparisonError.value = 'Comparison is taking too long'
    }
  }, 3000)
}

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date'
  try {
    return new Date(dateString).toLocaleString()
  } catch (error) {
    return 'Invalid date'
  }
}

const loadTestRunDetails = async (testRunId) => {
  try {
    const response = await apiCall(`/test/run/${testRunId}`)
    const details = await response.json()
    testRunDetails.value[testRunId] = details
    
    // If this is the latest test run, update the reference
    if (latestTestRun.value && latestTestRun.value._id === testRunId) {
      latestTestRun.value = details
    }
  } catch (error) {
    console.error('Failed to load test run details:', error)
  }
}

const startPolling = () => {
  if (pollingInterval) return
  
  pollingInterval = setInterval(async () => {
    if (latestTestRun.value && latestTestRun.value.status === 'running') {
      await loadTestRunDetails(latestTestRun.value._id)
      
      // Don't automatically update screenshot during polling
      // Let user explicitly select steps or keep MJPEG stream visible
    } else {
      stopPolling()
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

const runTest = async () => {
  if (!props.test || isRunning.value) return
  
  isRunning.value = true
  
  try {
    const response = await apiCall('/test/run/create', {
      method: 'POST',
      body: JSON.stringify({
        testId: props.test._id
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      
      emit('testUpdated')
      
      // Reload test runs and start polling
      await loadTestRuns()
      if (latestTestRun.value && latestTestRun.value.status === 'running') {
        startPolling()
      }
    } else {
      const errorData = await response.json()
      console.error('Failed to start test run:', errorData.error)
    }
  } catch (err) {
    console.error('Failed to start test run:', err)
  }
  
  isRunning.value = false
}

const toggleTestRunDetails = async (testRunId) => {
  if (expandedTestRuns.value.has(testRunId)) {
    expandedTestRuns.value.delete(testRunId)
  } else {
    expandedTestRuns.value.add(testRunId)
    
    // Load details if not already loaded
    if (!testRunDetails.value[testRunId]) {
      await loadTestRunDetails(testRunId)
    }
  }
}

const selectScreenshot = (screenshot, exceptionInference = null) => {
  selectedScreenshot.value = screenshot
  selectedStepVerdict.value = exceptionInference
  mjpegOverridden.value = true // Override MJPEG when screenshot is selected
}

const captureScreen = () => {
  // Placeholder for screen capture functionality
}

const onImageLoad = () => {
}


// Watch for test changes
watch(() => props.test, () => {
  stopPolling()
  selectedScreenshot.value = null
  mjpegOverridden.value = false // Reset override when test changes
  comparisonResult.value = null
  loadTestRuns()
}, { immediate: true })

// Watch for latest test run status changes
watch(() => latestTestRun.value?.status, (newStatus, oldStatus) => {
  if (newStatus === 'running' && oldStatus !== 'running') {
    startPolling()
  } else if (newStatus !== 'running' && oldStatus === 'running') {
    stopPolling()
    
    // Load comparison when test completes or quits
    if ((newStatus === 'completed' || newStatus === 'quit') && previousTestRuns.value.length > 0) {
      loadComparison(latestTestRun.value._id, previousTestRuns.value[0]._id)
    }
  }
})

onMounted(() => {
  loadTestRuns()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.screen-container {
  height: 100%;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.screen-wrapper {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen-image {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  display: block;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.comparison-loading {
  background: linear-gradient(45deg, #eff6ff, #f3e8ff, #eff6ff, #f3e8ff);
  background-size: 400% 400%;
  animation: gradientShift 3s ease-in-out infinite;
}

.comparison-completed {
  background: linear-gradient(45deg, #eff6ff, #f3e8ff, #eff6ff, #f3e8ff);
  background-size: 400% 400%;
  background-position: 0% 50%;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>