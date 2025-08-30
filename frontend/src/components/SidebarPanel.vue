<template>
  <div class="h-full flex flex-col bg-white border-r border-gray-200">
    <!-- Header with navigation -->
    <div class="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
      <div class="flex items-center space-x-2">
        <!-- Back button when in tests view -->
        <button
          v-if="currentView === 'tests'"
          @click="goBackToSuites"
          class="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors mr-1"
        >
          <span class="material-symbols-outlined text-gray-600 text-base">arrow_back</span>
        </button>
        
        <div :class="['w-7 h-7 rounded-lg flex items-center justify-center', currentView === 'suites' ? 'bg-indigo-100' : 'bg-green-100']">
          <span :class="['material-symbols-outlined text-base', currentView === 'suites' ? 'text-indigo-600' : 'text-green-600']">
            {{ currentView === 'suites' ? 'folder' : 'science' }}
          </span>
        </div>
        <h2 class="text-lg font-bold text-gray-800">
          {{ currentView === 'suites' ? 'Test Suites' : 'Tests' }}
        </h2>
      </div>
    </div>
    
    <!-- Content area -->
    <div class="flex-1 p-3 overflow-y-auto">
      <!-- Test Suites View -->
      <div v-if="currentView === 'suites'">
        <div v-if="testSuites.length === 0" class="text-center py-8">
          <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span class="material-symbols-outlined text-gray-400 text-xl">folder</span>
          </div>
          <p class="text-gray-500 font-medium text-sm">No test suites yet</p>
          <p class="text-gray-400 text-xs mt-1">Create your first test suite to get started</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="suite in testSuites"
            :key="suite._id"
            @click="selectSuite(suite)"
            :class="[
              'group p-3 rounded-lg cursor-pointer transition-all duration-200 border-2',
              selectedSuite?._id === suite._id 
                ? 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md shadow-indigo-100' 
                : 'border-gray-100 hover:border-indigo-100 hover:bg-gray-50 hover:shadow-sm'
            ]"
          >
            <div class="flex items-start space-x-2">
              <div :class="[
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                selectedSuite?._id === suite._id ? 'bg-indigo-500' : 'bg-gray-200 group-hover:bg-indigo-200'
              ]">
                <span :class="[
                  'material-symbols-outlined text-base',
                  selectedSuite?._id === suite._id ? 'text-white' : 'text-gray-600 group-hover:text-indigo-600'
                ]">folder</span>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-800 truncate text-sm">{{ suite.name }}</h3>
                <p class="text-xs text-gray-500 mt-0.5">{{ new Date(suite.createdAt).toLocaleDateString() }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tests View -->
      <div v-else-if="currentView === 'tests'">
        <div v-if="tests.length === 0" class="text-center py-8">
          <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span class="material-symbols-outlined text-gray-400 text-xl">science</span>
          </div>
          <p class="text-gray-500 font-medium text-sm">No tests yet</p>
          <p class="text-gray-400 text-xs mt-1">Create your first test</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="test in tests"
            :key="test._id"
            @click="selectTest(test)"
            :class="[
              'group p-3 rounded-lg cursor-pointer transition-all duration-200 border-2',
              selectedTestId === test._id 
                ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md shadow-green-100' 
                : 'border-gray-100 hover:border-green-100 hover:bg-gray-50 hover:shadow-sm'
            ]"
          >
            <div class="flex items-start space-x-2">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-800 truncate text-sm">{{ test.name }}</h3>
                <div class="flex items-center space-x-1.5 mt-1">
                  <span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{{ test.previewType }}</span>
                  <span :class="[
                    'px-1.5 py-0.5 rounded text-xs font-medium',
                    test.state === 'ready' ? 'bg-green-100 text-green-700' :
                    test.state === 'running' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  ]">{{ test.state }}</span>
                </div>
                
                <!-- Last Run Status Line -->
                <div v-if="test.lastRun" class="flex items-center space-x-1.5 mt-1.5">
                  <span class="material-symbols-outlined text-xs text-gray-400">history</span>
                  <span class="text-xs text-gray-500">Last run:</span>
                  <span :class="[
                    'inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-xs font-medium',
                    test.lastRun.status === 'completed' ? 'bg-green-100 text-green-700' :
                    test.lastRun.status === 'quit' ? 'bg-red-100 text-red-700' :
                    test.lastRun.status === 'running' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  ]">
                    <span class="material-symbols-outlined text-xs">
                      {{ test.lastRun.status === 'completed' ? 'check_circle' :
                         test.lastRun.status === 'quit' ? 'cancel' :
                         test.lastRun.status === 'running' ? 'hourglass_empty' : 'help' }}
                    </span>
                    <span>{{ getLastRunStatusText(test.lastRun.status) }}</span>
                  </span>
                  <span class="text-xs text-gray-400">{{ formatLastRunDate(test.lastRun.createdAt) }}</span>
                </div>
                
                <div v-else class="flex items-center space-x-1.5 mt-1.5">
                  <span class="material-symbols-outlined text-xs text-gray-400">history</span>
                  <span class="text-xs text-gray-400 italic">Never run</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Action buttons -->
    <div class="p-3 bg-gray-50 border-t border-gray-200">
      <!-- Test Suite creation button -->
      <button
        v-if="currentView === 'suites'"
        @click="showCreateSuiteDialog = true"
        class="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
      >
        <span class="material-symbols-outlined text-base">add_circle</span>
        <span>Create Suite</span>
      </button>
      
      <!-- Test creation button -->
      <button
        v-else-if="currentView === 'tests' && selectedSuite"
        @click="showCreateTestDialog = true"
        class="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
      >
        <span class="material-symbols-outlined text-base">add_circle</span>
        <span>Create Test</span>
      </button>
    </div>
    
    <!-- Create Test Suite Dialog -->
    <div v-if="showCreateSuiteDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-white rounded-xl p-6 w-80 shadow-xl border border-gray-100">
        <div class="flex items-center space-x-3 mb-5">
          <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <span class="material-symbols-outlined text-indigo-600 text-base">add_circle</span>
          </div>
          <h3 class="text-lg font-bold text-gray-800">Create Test Suite</h3>
        </div>
        
        <form @submit.prevent="createTestSuite">
          <div class="mb-5">
            <label class="block text-sm font-semibold text-gray-700 mb-2">Suite Name</label>
            <input
              v-model="newSuiteName"
              type="text"
              required
              placeholder="Enter suite name..."
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          <div class="flex space-x-3">
            <button
              type="button"
              @click="showCreateSuiteDialog = false"
              class="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 px-3 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md font-medium text-sm"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Create Test Dialog -->
    <CreateTestDialog
      v-if="showCreateTestDialog"
      :testSuite="selectedSuite"
      @close="showCreateTestDialog = false"
      @created="onTestCreated"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import CreateTestDialog from './CreateTestDialog.vue'

const props = defineProps(['selectedSuite', 'selectedTestId'])
const emit = defineEmits(['suiteSelected', 'testSelected'])

const { apiCall } = useAuth()

const currentView = ref('suites')
const testSuites = ref([])
const tests = ref([])
const showCreateSuiteDialog = ref(false)
const showCreateTestDialog = ref(false)
const newSuiteName = ref('')

const selectedSuite = ref(props.selectedSuite)
const selectedTestId = ref(props.selectedTestId)

const selectSuite = (suite) => {
  selectedSuite.value = suite
  selectedTestId.value = null
  currentView.value = 'tests'
  emit('suiteSelected', suite)
  loadTests()
}

const selectTest = (test) => {
  selectedTestId.value = test._id
  emit('testSelected', test._id)
}

const goBackToSuites = () => {
  currentView.value = 'suites'
  selectedTestId.value = null
  emit('testSelected', null)
}

const loadTestSuites = async () => {
  try {
    const response = await apiCall('/testSuite/list')
    testSuites.value = await response.json()
  } catch (error) {
    console.error('Failed to load test suites:', error)
  }
}

const loadTests = async () => {
  if (!selectedSuite.value) {
    tests.value = []
    return
  }
  
  try {
    const response = await apiCall(`/test/list?testSuiteId=${selectedSuite.value._id}`)
    tests.value = await response.json()
  } catch (error) {
    console.error('Failed to load tests:', error)
  }
}

const createTestSuite = async () => {
  try {
    const response = await apiCall('/testSuite/create', {
      method: 'POST',
      body: JSON.stringify({ name: newSuiteName.value })
    })
    
    if (response.ok) {
      await loadTestSuites()
      showCreateSuiteDialog.value = false
      newSuiteName.value = ''
    }
  } catch (error) {
    console.error('Failed to create test suite:', error)
  }
}

const onTestCreated = () => {
  showCreateTestDialog.value = false
  loadTests()
}

const refreshTests = async () => {
  await loadTests()
}

// Expose refreshTests method to parent
defineExpose({
  refreshTests
})

// Watch for prop changes
watch(() => props.selectedSuite, (newSuite) => {
  selectedSuite.value = newSuite
  if (newSuite && currentView.value === 'suites') {
    currentView.value = 'tests'
    loadTests()
  }
})

watch(() => props.selectedTestId, (newTestId) => {
  selectedTestId.value = newTestId
})

onMounted(() => {
  loadTestSuites()
})

const getLastRunStatusText = (status) => {
  switch (status) {
    case 'completed': return 'PASS'
    case 'quit': return 'FAIL'
    case 'running': return 'RUNNING'
    default: return status?.toUpperCase() || 'UNKNOWN'
  }
}

const formatLastRunDate = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}
</script>
