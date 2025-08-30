<template>
  <div class="h-full p-4 space-y-4 overflow-y-auto">
    <!-- Test Information -->
    <div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
      <div class="flex items-center space-x-2 mb-3">
        <div class="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
          <span class="material-symbols-outlined text-blue-600 text-sm">info</span>
        </div>
        <h3 class="text-base font-bold text-gray-800">Test Information</h3>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-2">
          <div>
            <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Device</span>
            <p class="font-mono text-gray-800 bg-gray-50 px-2 py-1.5 rounded-md mt-1 text-sm">{{ test.deviceId }}</p>
          </div>
          <div>
            <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</span>
            <p class="text-gray-800 bg-gray-50 px-2 py-1.5 rounded-md mt-1 text-sm">{{ test.previewType }}</p>
          </div>
        </div>
        <div class="space-y-2">
          <div>
            <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</span>
            <p class="text-gray-800 bg-gray-50 px-2 py-1.5 rounded-md mt-1 text-sm">{{ new Date(test.createdAt).toLocaleString() }}</p>
          </div>
          <div>
            <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">State</span>
            <p class="text-gray-800 bg-gray-50 px-2 py-1.5 rounded-md mt-1 text-sm">{{ test.state }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- ADB Command -->
    <div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
      <div class="flex items-center space-x-2 mb-3">
        <div class="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
          <span class="material-symbols-outlined text-green-600 text-sm">terminal</span>
        </div>
        <h3 class="text-base font-bold text-gray-800">ADB Command</h3>
      </div>
      <div class="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto border-l-4 border-green-400">
        {{ test.adb_cmdline }}
      </div>
    </div>
    
    <!-- Instructions (if available) -->
    <div v-if="test.instruction" class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
      <div class="flex items-center space-x-2 mb-3">
        <div class="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
          <span class="material-symbols-outlined text-purple-600 text-sm">description</span>
        </div>
        <h3 class="text-base font-bold text-gray-800">Instructions</h3>
      </div>
      <div class="bg-purple-50 rounded-lg p-3 text-gray-700 leading-relaxed border-l-4 border-purple-400 text-sm">
        {{ test.instruction }}
      </div>
    </div>
    
    <!-- Command Test Section -->
    <div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
      <div class="flex items-center space-x-2 mb-4">
        <div class="w-6 h-6 bg-indigo-100 rounded-md flex items-center justify-center">
          <span class="material-symbols-outlined text-indigo-600 text-sm">code</span>
        </div>
        <h3 class="text-base font-bold text-gray-800">Test Command</h3>
      </div>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-2">Command to Execute</label>
          <div class="flex space-x-2">
            <input
              v-model="testCommand"
              type="text"
              placeholder="Enter shell command to test..."
              class="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
            />
            <button
              @click="executeCommand"
              :disabled="!testCommand.trim() || loading"
              class="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
            >
              <span class="material-symbols-outlined text-sm">{{ loading ? 'hourglass_empty' : 'play_arrow' }}</span>
              <span>{{ loading ? 'Executing...' : 'Execute' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Command Output -->
    <div v-if="commandResults.length > 0" class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
      <div class="flex items-center space-x-2 mb-4">
        <div class="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center">
          <span class="material-symbols-outlined text-gray-600 text-sm">receipt_long</span>
        </div>
        <h3 class="text-base font-bold text-gray-800">Command Results</h3>
      </div>
      <div class="space-y-3 max-h-80 overflow-y-auto">
        <div
          v-for="(result, index) in commandResults"
          :key="index"
          class="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{{ result.command }}</span>
              <span class="text-xs text-gray-500">{{ new Date(result.timestamp).toLocaleString() }}</span>
            </div>
            <span :class="result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'" class="px-2 py-0.5 rounded-full text-xs font-medium">
              {{ result.success ? 'Success' : 'Failed' }}
            </span>
          </div>
          
          <div v-if="result.output" class="bg-gray-900 text-green-400 rounded-md p-2.5 font-mono text-xs whitespace-pre-wrap mb-2 border-l-4 border-green-400">{{ result.output }}</div>
          
          <div v-if="result.stderr" class="bg-red-900 text-red-300 rounded-md p-2.5 font-mono text-xs whitespace-pre-wrap mb-2 border-l-4 border-red-400">{{ result.stderr }}</div>
          
          <div v-if="result.error" class="bg-red-50 text-red-800 rounded-md p-2.5 text-xs border-l-4 border-red-400">{{ result.error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps(['test'])

const { apiCall } = useAuth()

const testCommand = ref('')
const loading = ref(false)
const commandResults = ref([])

const executeCommand = async () => {
  if (!testCommand.value.trim()) return
  
  loading.value = true
  
  try {
    const response = await apiCall('/test/preview/cmdlineTest', {
      method: 'POST',
      body: JSON.stringify({
        testId: props.test._id,
        cmdline: testCommand.value.trim()
      })
    })
    
    const result = await response.json()
    
    commandResults.value.unshift({
      command: testCommand.value.trim(),
      success: result.success,
      output: result.output,
      stderr: result.stderr,
      error: result.error,
      timestamp: new Date()
    })
    
    testCommand.value = ''
  } catch (error) {
    commandResults.value.unshift({
      command: testCommand.value.trim(),
      success: false,
      error: error.message,
      timestamp: new Date()
    })
  }
  
  loading.value = false
}
</script>
