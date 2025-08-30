<template>
  <div
    @click="$emit('select', step.screenshot, step.exceptionInferResponse)"
    class="flex-shrink-0 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200 min-w-0"
  >
    <div class="flex items-start space-x-3">
      <img
        :src="`data:image/jpeg;base64,${step.screenshot}`"
        :alt="`Step ${index + 1}`"
        class="h-48 w-auto rounded object-cover flex-shrink-0"
      />
      <div class="min-w-0 flex-1 h-48 overflow-y-auto">
        <!-- Verdict Badge (integrated) -->
        <div class="mb-2">
          <div :class="badgeClasses">
            <span :class="iconClasses">{{ verdictIcon }}</span>
            <span :class="textClasses">{{ verdictDisplayText }}</span>
          </div>
        </div>
        
        <div class="w-60 text-sm text-gray-600 leading-tight mb-2">
          <div class="flex items-start justify-between space-x-2">
            <span class="flex-1">{{ getDisplayText(step.exceptionInferResponse) }}</span>
            <button
              v-if="verdictDetails.type === 'consistency' && verdictDetails.reason"
              @click.stop="copyMessage"
              :class="copyButtonClasses"
              :title="copySuccess ? 'Copied!' : 'Copy message'"
            >
              <span class="material-symbols-outlined text-xs">{{ copySuccess ? 'check' : 'content_copy' }}</span>
            </button>
          </div>
        </div>
        
        <!-- UI Issues Display -->
        <div v-if="step.issues && step.issues.length > 0" class="w-60 space-y-1">
          <div
            v-for="(issue, issueIndex) in step.issues"
            :key="issueIndex"
            class="bg-orange-50 border border-orange-200 rounded p-2"
          >
            <div class="text-sm font-semibold text-orange-800 truncate" :title="issue.summary">Possible {{ issue.summary }}</div>
            <div class="text-xs text-orange-700 mt-1 line-clamp-2" :title="issue.details">{{ issue.details }}</div>
          </div>
        </div>
        
        <div v-else-if="step.issuesAnalyzedAt" class="w-60 text-xs text-gray-500 italic">
          No UI issues detected
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  step: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  }
})

defineEmits(['select'])

const verdictDetails = computed(() => {
  if (!props.step.exceptionInferResponse) {
    return { type: 'unknown' }
  }
  
  // Extract Python code from triple backticks if present
  let code = props.step.exceptionInferResponse;
  const pythonMatch = props.step.exceptionInferResponse.match(/```python\s*([\s\S]*?)\s*```/);
  if (pythonMatch) {
    code = pythonMatch[1];
  }
  
  // Modified regex to handle nested quotes - look for exception_consistency and extract everything between the outer quotes
  const consistencyMatch = code.match(/exception_consistency\(reason=(['"])(.*?)\1\)/s);
  if (consistencyMatch) {
    return { type: 'consistency', reason: consistencyMatch[2] }
  }
  
  // Modified regex for crashed exception as well
  const crashedMatch = code.match(/exception_crashed\(reason=(['"])(.*?)\1\)/s);
  if (crashedMatch) {
    return { type: 'crashed', reason: crashedMatch[2] }
  }
  
  if (code.includes('exception_loading()')) {
    return { type: 'loading' }
  }
  
  if (code.includes('exception_blank_area()')) {
    return { type: 'blank' }
  }
  
  if (code.includes('pass()')) {
    return { type: 'pass' }
  }
  
  return { type: 'unknown' }
})

const verdictIcon = computed(() => {
  switch (verdictDetails.value.type) {
    case 'pass': return 'check_circle'
    case 'loading': return 'hourglass_empty'
    case 'consistency': return 'error'
    case 'crashed': return 'destruction'
    case 'blank': return 'warning'
    default: return 'help'
  }
})

const verdictDisplayText = computed(() => {
  switch (verdictDetails.value.type) {
    case 'pass': 
      return 'Pass'
    case 'loading': 
      return 'Loading Detected'
    case 'consistency': 
      return 'Consistency Issue'
    case 'crashed': 
      return 'Crashed'
    case 'blank': 
      return 'Blank Area Detected'
    default: 
      return 'Unknown'
  }
})

const badgeClasses = computed(() => {
  const baseClasses = 'inline-flex items-center space-x-1 rounded-full font-semibold'
  const sizeClasses = 'px-3 py-1.5 text-sm' // lg size
  
  let colorClasses = ''
  switch (verdictDetails.value.type) {
    case 'pass':
      colorClasses = 'bg-green-100 text-green-700'
      break
    case 'loading':
      colorClasses = 'bg-yellow-100 text-yellow-700'
      break
    case 'consistency':
    case 'crashed':
    case 'blank':
      colorClasses = 'bg-red-100 text-red-700'
      break
    default:
      colorClasses = 'bg-gray-100 text-gray-700'
  }
  
  return `${baseClasses} ${sizeClasses} ${colorClasses}`
})

const iconClasses = computed(() => {
  return 'material-symbols-outlined text-base'
})

const textClasses = computed(() => {
  return 'text-sm'
})

const copySuccess = ref(false)

const copyButtonClasses = computed(() => {
  const baseClasses = 'p-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0'
  if (copySuccess.value) {
    return `${baseClasses} bg-green-100 text-green-600`
  }
  return `${baseClasses} text-gray-400 hover:text-gray-600`
})

const getVerdictDetails = (exceptionInference) => {
  if (!exceptionInference) {
    return { type: 'unknown', reason: null }
  }
  
  // Extract Python code from triple backticks if present
  let code = exceptionInference;
  const pythonMatch = exceptionInference.match(/```python\s*([\s\S]*?)\s*```/);
  if (pythonMatch) {
    code = pythonMatch[1];
  }
  
  // Modified regex to handle nested quotes - capture the quote character and reuse it
  const consistencyMatch = code.match(/exception_consistency\(reason=(['"])(.*?)\1\)/s);
  if (consistencyMatch) {
    return { type: 'consistency', reason: consistencyMatch[2] }
  }
  
  // Modified regex for crashed exception as well
  const crashedMatch = code.match(/exception_crashed\(reason=(['"])(.*?)\1\)/s);
  if (crashedMatch) {
    return { type: 'crashed', reason: crashedMatch[2] }
  }
  
  if (code.includes('exception_loading()')) {
    return { type: 'loading', reason: null }
  }
  
  if (code.includes('exception_blank_area()')) {
    return { type: 'blank', reason: null }
  }
  
  if (code.includes('pass()')) {
    return { type: 'pass', reason: null }
  }
  
  return { type: 'unknown', reason: null }
}

const getDisplayText = (exceptionInference) => {
  if (!exceptionInference) return 'No exception inference'
  
  const details = getVerdictDetails(exceptionInference)
  
  // Return the reason if available, otherwise return the verdict type
  if (details.reason) {
    return details.reason
  }
  
  switch (details.type) {
    case 'pass': return 'Test step passed'
    case 'loading': return 'Waiting for loading...'
    case 'blank': return 'Blank area detected'
    case 'consistency': return 'Consistency issue detected'
    case 'crashed': return 'App crashed'
    default: return 'Unknown verdict'
  }
}

const copyMessage = async () => {
  if (verdictDetails.value.type !== 'consistency' || !verdictDetails.value.reason) return
  
  try {
    await navigator.clipboard.writeText(verdictDetails.value.reason)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy message:', error)
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>