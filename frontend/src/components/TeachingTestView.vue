<template>
  <div class="h-full flex bg-white">
    <!-- Left Pane - Takes remaining space -->
    <div class="flex-1 min-w-0 flex flex-col bg-gray-50 border-r border-gray-200 overflow-y-auto p-4 space-y-4">
      <!-- Status Information -->
      <div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
        <div class="flex items-center space-x-2 mb-3">
          <div class="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
            <span class="material-symbols-outlined text-blue-600 text-sm">info</span>
          </div>
          <h3 class="text-base font-bold text-gray-800">Status</h3>
        </div>
        
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-500">Connection</span>
            <div class="flex items-center space-x-1">
              <div :class="['w-2 h-2 rounded-full', isPolling ? 'bg-green-400' : 'bg-gray-400']"></div>
              <span class="text-xs text-gray-600">{{ isPolling ? 'Live' : 'Stopped' }}</span>
            </div>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-500">Last Update</span>
            <span class="text-xs text-gray-600">{{ lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never' }}</span>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-500">Window Focus</span>
            <span class="text-xs text-gray-600">{{ isWindowFocused ? 'Focused' : 'Not Focused' }}</span>
          </div>
        </div>
      </div>
      
      <!-- Teaching Controls -->
      <div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
        <div class="flex items-center space-x-2 mb-3">
          <div class="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
            <span class="material-symbols-outlined text-purple-600 text-sm">school</span>
          </div>
          <h3 class="text-base font-bold text-gray-800">Teaching Mode</h3>
        </div>
        
        <!-- Coordinate Display -->
        <div v-if="showCoordinates" class="mb-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
          <div class="text-xs font-medium text-purple-700 mb-1">Cursor Position</div>
          <div class="font-mono text-sm text-purple-800">
            {{ cursorPercent.x.toFixed(1) }}%, {{ cursorPercent.y.toFixed(1) }}%
          </div>
        </div>
        
        <button
          @click="toggleCapturing"
          :disabled="isAnalyzing"
          class="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
        >
          <span class="material-symbols-outlined text-base">{{ isAnalyzing ? 'hourglass_empty' : isCapturing ? 'stop_circle' : 'play_circle' }}</span>
          <span>{{ isAnalyzing ? 'Analyzing...' : isCapturing ? 'Stop Capturing' : 'Start Capturing Actions' }}</span>
        </button>
      </div>
      
      <!-- Steps Area -->
      <div class="flex-1 bg-white rounded-xl p-4 shadow-md border border-gray-100 overflow-y-auto">
        <div class="flex items-center space-x-2 mb-3">
          <div class="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
            <span class="material-symbols-outlined text-green-600 text-sm">list</span>
          </div>
          <h3 class="text-base font-bold text-gray-800">Teaching Steps</h3>
        </div>
        
        <div v-if="taughtSteps.length === 0" class="text-center py-8">
          <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span class="material-symbols-outlined text-gray-400 text-xl">gesture</span>
          </div>
          <p class="text-gray-500 font-medium text-sm mb-1">No steps recorded</p>
          <p class="text-gray-400 text-xs">Start capturing to record your actions</p>
        </div>
        
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between mb-2">
            <p class="text-green-600 font-medium text-sm">{{ taughtSteps.length }} steps recorded</p>
            <span v-if="isLoadingSteps" class="text-xs text-gray-400">Loading...</span>
          </div>
          
          <!-- Horizontal scrolling screenshots -->
          <div class="overflow-x-auto pb-2">
            <div class="flex space-x-3" style="width: max-content;">
              <div
                v-for="(step, index) in taughtSteps"
                :key="index"
                class="flex-shrink-0 w-32 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
              >
                <div class="aspect-[9/16] relative">
                  <img
                    v-if="step.imageUrl"
                    :src="step.imageUrl"
                    :alt="`Step ${index + 1}`"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span class="material-symbols-outlined text-gray-400 text-lg">image</span>
                  </div>
                  
                  <!-- Step number overlay -->
                  <div class="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
                    {{ index + 1 }}
                  </div>
                  
                  <!-- Step type overlay -->
                  <div class="absolute bottom-1 right-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded">
                    {{ step.type }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <p class="text-gray-400 text-xs text-center">Click Stop Capturing to analyze and generate test plan</p>
        </div>
      </div>
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
      
      <!-- MJPEG Stream -->
      <div v-else-if="showMjpegStream" class="screen-wrapper">
        <img
          ref="screenImg"
          :src="mjpegUrl"
          alt="Live Stream"
          class="screen-image"
          @load="onImageLoad"
        />
        
        <!-- Overlay for cursor tracking -->
        <div
          ref="overlay"
          class="screen-overlay"
          @mousemove="onMouseMove"
          @mouseleave="onMouseLeave"
          @click="onTap"
        ></div>
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
        
        <!-- Overlay for cursor tracking -->
        <div
          ref="overlay"
          class="screen-overlay"
          @mousemove="onMouseMove"
          @mouseleave="onMouseLeave"
          @click="onTap"
        ></div>
      </div>
    </div>
    
    <!-- Analysis Result Dialog -->
    <div v-if="showAnalysisDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900">Test Analysis Complete</h2>
          <p class="text-gray-600 mt-1">Review and edit the generated test plan</p>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-96">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Test Title</label>
              <input
                v-model="analysisResult.title"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter test title..."
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Test Plan</label>
              <textarea
                v-model="analysisResult.plan"
                rows="8"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter test plan..."
              ></textarea>
            </div>
          </div>
        </div>
        
        <div class="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="closeAnalysisDialog"
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="saveAnalysisResult"
            :disabled="isSaving"
            class="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span class="material-symbols-outlined text-sm" v-if="isSaving">hourglass_empty</span>
            <span>{{ isSaving ? 'Saving...' : 'Save Test' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps(['test'])
const emit = defineEmits(['testUpdated'])

const { apiCall } = useAuth()

const screenImage = ref(null)
const loading = ref(false)
const error = ref(null)
const isPolling = ref(false)
const lastUpdate = ref(null)
const pollInterval = ref(null)
const isWindowFocused = ref(true)

const screenImg = ref(null)
const overlay = ref(null)
const showCoordinates = ref(false)
const cursorPercent = ref({ x: 0, y: 0 })

const isCapturing = ref(false)
const isAnalyzing = ref(false)
const showAnalysisDialog = ref(false)
const analysisResult = ref({ title: '', plan: '' })
const isSaving = ref(false)

// MJPEG stream support
const mjpegUrl = ref(localStorage.getItem('mjpegUrl'))
const showMjpegStream = computed(() => !!mjpegUrl.value)

const taughtSteps = ref([])
const isLoadingSteps = ref(false)
let stepLoadTimeout = null

const taughtStepsCount = computed(() => {
  return taughtSteps.value.length
})

// Polling and screen capture
watch(() => props.test, (newTest) => {
  if (newTest && newTest.taughtSteps && newTest.taughtSteps.length > 0) {
    isCapturing.value = true
  }
}, { immediate: true })

const captureScreen = async () => {
  if (!props.test) return
  
  loading.value = true
  error.value = null
  
  try {
    const response = await apiCall(`/test/preview/teach/getScreen?testId=${props.test._id}`)
    
    if (response.ok) {
      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)
      
      if (screenImage.value && screenImage.value.startsWith('blob:')) {
        URL.revokeObjectURL(screenImage.value)
      }
      
      screenImage.value = imageUrl
      lastUpdate.value = Date.now()
    } else {
      const errorData = await response.json()
      error.value = errorData.error || 'Failed to capture screen'
    }
  } catch (err) {
    error.value = err.message || 'Network error'
  }
  
  loading.value = false
}

const scheduleNextPoll = () => {
  if (!isPolling.value) return
  
  pollInterval.value = setTimeout(() => {
    if (isWindowFocused.value) {
      captureScreen().then(() => {
        scheduleNextPoll()
      })
    } else {
      scheduleNextPoll()
    }
  }, 1000)
}

const startPolling = () => {
  if (isPolling.value) return
  
  isPolling.value = true
  captureScreen().then(() => {
    scheduleNextPoll()
  })
}

const stopPolling = () => {
  if (pollInterval.value) {
    clearTimeout(pollInterval.value)
    pollInterval.value = null
  }
  isPolling.value = false
}

const onImageLoad = () => {
  // Image loaded successfully
}

const onMouseMove = (event) => {
  if (!overlay.value || !screenImg.value) return
  
  const rect = overlay.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  const percentX = (x / rect.width) * 100
  const percentY = (y / rect.height) * 100
  
  cursorPercent.value = { x: percentX, y: percentY }
  showCoordinates.value = true
}

const onMouseLeave = () => {
  showCoordinates.value = false
}

const onTap = async (event) => {
  if (!overlay.value || !props.test) return
  
  const rect = overlay.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  const percentX = (x / rect.width) * 100
  const percentY = (y / rect.height) * 100
  
  try {
    if (isCapturing.value) {
      await apiCall('/test/preview/teach/tap', {
        method: 'POST',
        body: JSON.stringify({
          testId: props.test._id,
          percentX: percentX,
          percentY: percentY
        })
      })
      
      console.log(`Recorded tap at ${percentX.toFixed(1)}%, ${percentY.toFixed(1)}%`)
      
      // Schedule steps reload after tap
      scheduleStepsLoad()
    }
    
    const inputResponse = await apiCall('/test/preview/input/tap', {
      method: 'POST',
      body: JSON.stringify({
        testId: props.test._id,
        percentX: percentX,
        percentY: percentY
      })
    })
    
    const inputResult = await inputResponse.json()
    console.log(`Executed tap at coordinates: ${inputResult.coordinates.x}, ${inputResult.coordinates.y}`)
    
  } catch (error) {
    console.error('Failed to process tap:', error)
  }
}

const toggleCapturing = async () => {
  if (isCapturing.value) {
    await stopCapturing()
  } else {
    isCapturing.value = true
  }
}

const stopCapturing = async () => {
  if (!props.test) return
  
  isAnalyzing.value = true
  
  try {
    const response = await apiCall('/test/preview/teach/stop', {
      method: 'POST',
      body: JSON.stringify({
        testId: props.test._id
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      analysisResult.value = {
        title: result.title,
        plan: result.plan
      }
      showAnalysisDialog.value = true
      isCapturing.value = false
    } else {
      console.error('Analysis failed:', result.error)
    }
  } catch (error) {
    console.error('Failed to analyze steps:', error)
  }
  
  isAnalyzing.value = false
}

const closeAnalysisDialog = () => {
  showAnalysisDialog.value = false
  analysisResult.value = { title: '', plan: '' }
}

const saveAnalysisResult = async () => {
  if (!analysisResult.value.title.trim() || !analysisResult.value.plan.trim()) {
    return
  }
  
  isSaving.value = true
  
  try {
    const response = await apiCall('/test/preview/update', {
      method: 'POST',
      body: JSON.stringify({
        testId: props.test._id,
        name: analysisResult.value.title,
        instruction: analysisResult.value.plan
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      closeAnalysisDialog()
      emit('testUpdated')
      console.log('Test updated successfully')
    } else {
      console.error('Failed to update test:', result.error)
    }
  } catch (error) {
    console.error('Failed to save test:', error)
  }
  
  isSaving.value = false
}

const handleFocus = () => {
  isWindowFocused.value = true
}

const handleBlur = () => {
  isWindowFocused.value = false
}

const loadSteps = async () => {
  if (!props.test?._id) return
  
  isLoadingSteps.value = true
  
  try {
    const response = await apiCall(`/test/${props.test._id}`)
    
    if (response.ok) {
      const testData = await response.json()
      
      if (testData.taughtSteps && testData.taughtSteps.length > 0) {
        // Convert base64 image data to data URLs
        taughtSteps.value = testData.taughtSteps.map((step, index) => {
          let imageUrl = null
          
          if (step.image) {
            // Create data URL from base64 data
            imageUrl = `data:image/jpeg;base64,${step.image}`
          }
          
          return {
            ...step,
            imageUrl
          }
        })
      } else {
        taughtSteps.value = []
      }
    }
  } catch (error) {
    console.error('Failed to load steps:', error)
  }
  
  isLoadingSteps.value = false
}

const scheduleStepsLoad = () => {
  // Clear any existing timeout
  if (stepLoadTimeout) {
    clearTimeout(stepLoadTimeout)
  }
  
  // Schedule load after 2 seconds
  stepLoadTimeout = setTimeout(() => {
    loadSteps()
  }, 2000)
}

onMounted(() => {
  startPolling()
  window.addEventListener('focus', handleFocus)
  window.addEventListener('blur', handleBlur)
  
  // Load steps if test has them
  if (props.test?.taughtSteps && props.test.taughtSteps.length > 0) {
    loadSteps()
  }
})

onUnmounted(() => {
  stopPolling()
  
  if (screenImage.value && screenImage.value.startsWith('blob:')) {
    URL.revokeObjectURL(screenImage.value)
  }
  
  // Clear step load timeout
  if (stepLoadTimeout) {
    clearTimeout(stepLoadTimeout)
  }
  
  // Clean up step image URLs
  cleanupImageUrls()
  
  window.removeEventListener('focus', handleFocus)
  window.removeEventListener('blur', handleBlur)
})

// Clean up image URLs when component unmounts
const cleanupImageUrls = () => {
  // No cleanup needed for data URLs, just clear the array
  taughtSteps.value = []
}

// Watch for test changes to reload steps
watch(() => props.test?._id, (newTestId, oldTestId) => {
  if (newTestId && newTestId !== oldTestId) {
    // Clean up old image URLs
    cleanupImageUrls()
    taughtSteps.value = []
    
    // Load steps for new test
    loadSteps()
  }
}, { immediate: true })
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

.screen-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  cursor: crosshair;
}
</style>