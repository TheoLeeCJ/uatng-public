<template>
  <span :class="badgeClasses">
    <span class="material-symbols-outlined text-sm font-semibold">{{ statusIcon }}</span>
    <span>{{ statusText }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  }
})

const statusIcon = computed(() => {
  switch (props.status) {
    case 'completed': return 'check_circle'
    case 'quit': return 'cancel'
    case 'running': return 'hourglass_empty'
    default: return 'help'
  }
})

const statusText = computed(() => {
  switch (props.status) {
    case 'completed': return 'PASS'
    case 'quit': return 'FAIL'
    case 'running': return 'RUNNING'
    default: return props.status.toUpperCase()
  }
})

const badgeClasses = computed(() => {
  const baseClasses = 'flex flex-row space-x-2 items-center justify-center text-sm font-semibold px-2 py-0.5 rounded-lg'
  
  switch (props.status) {
    case 'completed':
      return `${baseClasses} bg-green-100 text-green-700`
    case 'quit':
      return `${baseClasses} bg-red-100 text-red-700`
    case 'running':
      return `${baseClasses} bg-yellow-100 text-yellow-700`
    default:
      return `${baseClasses} bg-gray-100 text-gray-700`
  }
})
</script>
