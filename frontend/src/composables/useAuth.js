import { ref, onMounted } from 'vue'

const API_BASE = 'http://localhost:3000'

export const user = ref(null)
export const isAuthenticated = ref(false)

export function useAuth() {
  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_BASE}/user/me`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const userData = await response.json()
        user.value = userData
        isAuthenticated.value = true
      } else {
        user.value = null
        isAuthenticated.value = false
      }
    } catch (error) {
      user.value = null
      isAuthenticated.value = false
    }
  }

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE}/user/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (response.ok) {
        user.value = { username: data.username, role: data.role }
        isAuthenticated.value = true
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: 'Connection failed' }
    }
  }

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/user/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    user.value = null
    isAuthenticated.value = false
  }

  const apiCall = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    if (response.status === 401) {
      user.value = null
      isAuthenticated.value = false
      throw new Error('Unauthorized')
    }
    
    return response
  }

  // Check authentication status on mount
  onMounted(() => {
    checkAuth()
  })

  return {
    user,
    isAuthenticated,
    login,
    logout,
    apiCall,
    checkAuth
  }
}
