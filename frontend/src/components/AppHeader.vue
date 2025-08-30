<template>
  <header class="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-lg">
    <div class="px-6 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
          <span class="material-symbols-outlined text-lg">rocket_launch</span>
        </div>
        <h1 class="text-xl font-bold tracking-tight">UAT-NG</h1>
      </div>
      
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2 bg-white bg-opacity-10 rounded-full px-3 py-1.5">
          <div class="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span class="material-symbols-outlined text-xs">person</span>
          </div>
          <span class="font-medium text-sm">{{ user?.username }}</span>
        </div>
        
        <div class="relative" ref="deviceDropdown">
          <button
            @click="toggleDevices"
            class="flex items-center space-x-2 px-3 py-1.5 bg-white bg-opacity-10 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200 backdrop-blur-sm"
          >
            <span class="material-symbols-outlined text-base">smartphone</span>
            <span class="font-medium text-sm">Devices</span>
            <span class="material-symbols-outlined text-xs transition-transform duration-200" :class="{ 'rotate-180': showDevices }">keyboard_arrow_down</span>
          </button>
          
          <div v-if="showDevices" class="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden">
            <div class="py-1">
              <div class="px-4 py-3 text-sm font-semibold text-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div class="flex items-center space-x-2">
                  <span class="material-symbols-outlined text-sm text-gray-600">devices</span>
                  <span>Connected Devices</span>
                </div>
              </div>
              <div v-if="loading" class="px-4 py-3 text-sm text-gray-500 flex items-center space-x-2">
                <div class="w-3 h-3 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                <span>Loading...</span>
              </div>
              <div v-else-if="Object.keys(devices).length === 0" class="px-4 py-3 text-sm text-gray-500 text-center">
                <span class="material-symbols-outlined text-gray-400 block mb-1 text-base">smartphone</span>
                No devices connected
              </div>
              <div v-else class="max-h-40 overflow-y-auto">
                <div v-for="(status, deviceId) in devices" :key="deviceId" class="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <div class="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
                        <span class="material-symbols-outlined text-green-600 text-xs">smartphone</span>
                      </div>
                      <span class="font-mono text-xs text-gray-700">{{ deviceId }}</span>
                    </div>
                    <span class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{{ status }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <button
          @click="handleLogout"
          class="flex items-center space-x-2 px-3 py-1.5 bg-red-500 bg-opacity-80 hover:bg-opacity-100 rounded-lg transition-all duration-200 backdrop-blur-sm"
        >
          <span class="material-symbols-outlined text-base">logout</span>
          <span class="font-medium text-sm">Logout</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user, logout, apiCall } = useAuth()

const showDevices = ref(false)
const devices = ref({})
const loading = ref(false)
const deviceDropdown = ref(null)

const toggleDevices = async () => {
  showDevices.value = !showDevices.value
  
  if (showDevices.value && Object.keys(devices.value).length === 0) {
    await loadDevices()
  }
}

const loadDevices = async () => {
  loading.value = true
  try {
    const response = await apiCall('/devices/list')
    devices.value = await response.json()
  } catch (error) {
    console.error('Failed to load devices:', error)
  }
  loading.value = false
}

const handleLogout = () => {
  logout()
}

const handleClickOutside = (event) => {
  if (deviceDropdown.value && !deviceDropdown.value.contains(event.target)) {
    showDevices.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
