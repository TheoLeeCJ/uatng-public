<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-100">
      <div class="flex items-center space-x-3 mb-6">
        <div class="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center">
          <span class="material-symbols-outlined text-white text-lg">add_circle</span>
        </div>
        <h3 class="text-xl font-bold text-gray-800">Create New Test</h3>
      </div>
      
      <form @submit.prevent="createTest">
        <!-- Test Type Selection -->
        <div class="mb-6">
          <h4 class="text-base font-semibold text-gray-800 mb-3">Choose Test Creation Method</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="group cursor-pointer">
              <input
                v-model="testType"
                type="radio"
                value="teaching"
                class="sr-only"
              />
              <div :class=" [
                'p-4 border-2 rounded-xl transition-all duration-200',
                testType === 'teaching' 
                  ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md shadow-blue-100' 
                  : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
              ]">
                <div class="flex items-start space-x-3">
                  <div :class=" [
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    testType === 'teaching' ? 'bg-blue-500' : 'bg-gray-200 group-hover:bg-blue-200'
                  ]">
                    <span :class=" [
                      'material-symbols-outlined text-lg',
                      testType === 'teaching' ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'
                    ]">school</span>
                  </div>
                  <div>
                    <h5 class="font-bold text-gray-800 text-base mb-1">Create by Teaching</h5>
                    <p class="text-gray-600 leading-relaxed text-sm">
                      Create the test by performing the UI interaction yourself, then letting UAT-NG learn from your demonstration.
                    </p>
                  </div>
                </div>
              </div>
            </label>
            
            <label class="group cursor-pointer">
              <input
                v-model="testType"
                type="radio"
                value="instruction"
                class="sr-only"
              />
              <div :class=" [
                'p-4 border-2 rounded-xl transition-all duration-200',
                testType === 'instruction' 
                  ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md shadow-purple-100' 
                  : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
              ]">
                <div class="flex items-start space-x-3">
                  <div :class=" [
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    testType === 'instruction' ? 'bg-purple-500' : 'bg-gray-200 group-hover:bg-purple-200'
                  ]">
                    <span :class=" [
                      'material-symbols-outlined text-lg',
                      testType === 'instruction' ? 'text-white' : 'text-gray-600 group-hover:text-purple-600'
                    ]">description</span>
                  </div>
                  <div>
                    <h5 class="font-bold text-gray-800 text-base mb-1">Create by Instructions</h5>
                    <p class="text-gray-600 leading-relaxed text-sm">
                      Create test from detailed written instructions describing what the test should do.
                    </p>
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>
        
        <!-- Common Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">Test Name</label>
            <input
              v-model="testName"
              type="text"
              required
              placeholder="Enter a descriptive test name..."
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">Target Device</label>
            <select
              v-model="selectedDevice"
              required
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
            >
              <option value="">Select device...</option>
              <option v-for="(status, deviceId) in devices" :key="deviceId" :value="deviceId">
                {{ deviceId }} ({{ status }})
              </option>
            </select>
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-bold text-gray-700 mb-1">ADB Command Line</label>
          <p class="text-xs text-gray-600 mb-2">The adb shell command to run before the test starts clicking around.</p>
          <textarea
            v-model="adbCmdline"
            rows="3"
            required
            class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-xs"
            placeholder="Enter ADB commands..."
          ></textarea>
        </div>
        
        <!-- Instruction Field (only for instruction type) -->
        <div v-if="testType === 'instruction'" class="mb-4">
          <label class="block text-sm font-bold text-gray-700 mb-2">Test Instructions</label>
          <textarea
            v-model="instruction"
            rows="4"
            required
            class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
            placeholder="Step 1. ...\nStep2. ..."
          ></textarea>
        </div>
        
        <div class="flex space-x-3">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg font-medium text-sm"
          >
            {{ loading ? 'Creating Test...' : 'Create Test' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps(['testSuite'])
const emit = defineEmits(['close', 'created'])

const { apiCall } = useAuth()

const testType = ref('teaching')
const testName = ref('')
const selectedDevice = ref('')
const adbCmdline = ref('monkey -p com.ss.android.ugc.trill -c android.intent.category.LAUNCHER 1')
const instruction = ref('')
const devices = ref({})
const loading = ref(false)

const loadDevices = async () => {
  try {
    const response = await apiCall('/devices/list')
    devices.value = await response.json()
  } catch (error) {
    console.error('Failed to load devices:', error)
  }
}

const createTest = async () => {
  loading.value = true
  
  const endpoint = testType.value === 'teaching' 
    ? '/test/preview/createFromTeaching'
    : '/test/preview/createFromInstruction'
  
  const body = {
    testSuiteId: props.testSuite._id,
    name: testName.value,
    adb_cmdline: adbCmdline.value,
    deviceId: selectedDevice.value
  }
  
  if (testType.value === 'instruction') {
    body.instruction = instruction.value
  }
  
  try {
    const response = await apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    
    if (response.ok) {
      emit('created')
    }
  } catch (error) {
    console.error('Failed to create test:', error)
  }
  
  loading.value = false
}

onMounted(() => {
  loadDevices()
})
</script>
