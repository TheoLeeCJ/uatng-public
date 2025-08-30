<template>
  <div class="h-full">
    <!-- Teaching Preview Mode -->
    <TeachingTestView 
      v-if="test.state === 'preview' && test.previewType === 'teaching'" 
      :test="test" 
      @testUpdated="$emit('testUpdated')" 
    />
    
    <!-- Ready Test Mode -->
    <ReadyTestView 
      v-else-if="test.state === 'ready'" 
      :test="test" 
      @testUpdated="$emit('testUpdated')" 
    />
    
    <!-- Default/Other states -->
    <div v-else class="h-full flex items-center justify-center bg-gray-50">
      <div class="text-center">
        <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span class="material-symbols-outlined text-gray-400 text-xl">visibility</span>
        </div>
        <p class="text-gray-500 font-medium text-sm mb-1">Test View</p>
        <p class="text-gray-400 text-xs">Unsupported test state or type</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import TeachingTestView from './TeachingTestView.vue'
import ReadyTestView from './ReadyTestView.vue'

const props = defineProps(['test'])
defineEmits(['testUpdated'])
</script>