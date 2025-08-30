<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 flex items-center justify-center p-6">
    <div class="max-w-md w-full">
      <!-- Logo and branding -->
      <div class="text-center mb-10">
        <div class="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/25">
          <span class="material-symbols-outlined text-3xl text-white">rocket_launch</span>
        </div>
        <h1 class="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">UAT-NG</h1>
        <p class="text-gray-600 text-lg">UI Automation Testing Platform</p>
      </div>

      <!-- Login form -->
      <div class="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
        <h2 class="text-2xl font-bold text-gray-800 text-center mb-8">Welcome Back</h2>
        
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label for="username" class="block text-sm font-bold text-gray-700 mb-2">Username</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="material-symbols-outlined text-gray-400">person</span>
              </div>
              <input
                id="username"
                v-model="username"
                type="text"
                required
                class="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Enter your username"
              />
            </div>
          </div>
          
          <div>
            <label for="password" class="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="material-symbols-outlined text-gray-400">lock</span>
              </div>
              <input
                id="password"
                v-model="password"
                type="password"
                required
                class="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
              />
            </div>
          </div>
          
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4">
            <div class="flex items-center space-x-2">
              <span class="material-symbols-outlined text-red-500 text-sm">error</span>
              <span class="text-red-700 text-sm font-medium">{{ error }}</span>
            </div>
          </div>
          
          <button
            type="submit"
            :disabled="loading"
            class="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <span v-if="loading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span class="material-symbols-outlined" v-else>login</span>
            <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
          </button>
        </form>
      </div>
      
      <!-- Footer -->
      <div class="text-center mt-8">
        <p class="text-gray-500 text-sm">
          Secure access to your automation testing platform
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { login } = useAuth()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  const result = await login(username.value, password.value)
  
  if (!result.success) {
    error.value = result.error
  }
  
  loading.value = false
}
</script>
