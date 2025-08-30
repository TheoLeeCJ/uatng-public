<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <AppHeader />
    
    <div class="flex-1 flex overflow-hidden">
      <!-- Combined Sidebar Panel (25%) -->
      <div class="w-1/4 flex-shrink-0">
        <SidebarPanel 
          :selectedSuite="selectedSuite"
          :selectedTestId="selectedTestId"
          @suiteSelected="onSuiteSelected"
          @testSelected="onTestSelected"
          ref="sidebarPanel"
        />
      </div>
      
      <!-- Main Panel (75%) -->
      <div class="flex-1 min-w-0">
        <TestDetailPanel 
          v-if="selectedTestId" 
          :testId="selectedTestId" 
          @testUpdated="onTestUpdated"
        />
        <TestSuiteInfoPanel 
          v-else-if="selectedSuite" 
          :testSuite="selectedSuite"
        />
        <WelcomePanel v-else />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppHeader from './AppHeader.vue'
import SidebarPanel from './SidebarPanel.vue'
import WelcomePanel from './WelcomePanel.vue'
import TestSuiteInfoPanel from './TestSuiteInfoPanel.vue'
import TestDetailPanel from './TestDetailPanel.vue'

const selectedSuite = ref(null)
const selectedTestId = ref(null)
const sidebarPanel = ref(null)

const onSuiteSelected = (suite) => {
  selectedSuite.value = suite
  selectedTestId.value = null // Clear selected test when suite changes
}

const onTestSelected = (testId) => {
  selectedTestId.value = testId
}

const onTestUpdated = () => {
  // Refresh the tests list
  if (sidebarPanel.value) {
    sidebarPanel.value.refreshTests()
  }
}
</script>
