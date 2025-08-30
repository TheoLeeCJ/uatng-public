<template>
  <div class="h-full flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
    <div class="w-full max-w-2xl text-center">
      <div class="mb-6">
        <div class="relative mb-4 flex justify-center">
          <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/25">
            <span class="material-symbols-outlined text-3xl text-white">folder</span>
          </div>
        </div>
        
        <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
          {{ testSuite.name }}
        </h1>
        <p class="text-lg text-gray-600 font-light">Test Suite</p>
      </div>
      
      <div class="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-6">
        <div class="grid grid-cols-2 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-indigo-600 mb-1">{{ testCount }}</div>
            <div class="text-sm text-gray-500 uppercase tracking-wide">Tests</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-purple-600 mb-1">{{ formatDate(testSuite.createdAt) }}</div>
            <div class="text-sm text-gray-500 uppercase tracking-wide">Created</div>
          </div>
        </div>
      </div>
      
      <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-xl">
        <h3 class="text-xl font-semibold mb-2">Ready to test?</h3>
        <p class="text-indigo-100 leading-relaxed">
          Select a test from the sidebar to view details and run automated testing, or create a new test to expand your test suite.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps(['testSuite'])

const { apiCall } = useAuth()
const testCount = ref(0)

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const loadTestCount = async () => {
  if (!props.testSuite) return
  
  try {
    const response = await apiCall(`/test/list?testSuiteId=${props.testSuite._id}`)
    const tests = await response.json()
    testCount.value = tests.length
  } catch (error) {
    console.error('Failed to load test count:', error)
    testCount.value = 0
  }
}

onMounted(() => {
  loadTestCount()
})
</script>
