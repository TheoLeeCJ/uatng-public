<script setup>
import { useAuth } from './composables/useAuth'
import LoginPage from './components/LoginPage.vue'
import Dashboard from './components/Dashboard.vue'

const { isAuthenticated } = useAuth()
</script>

<template>
  <div>
    <LoginPage v-if="!isAuthenticated" />
    <Dashboard v-else />
  </div>
</template>