<template>
  <div class="h-full flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
    <div class="w-full max-w-4xl text-center">
      <div class="mb-8">
        <div class="relative mb-6 flex justify-center">
          <div class="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/25">
            <span class="material-symbols-outlined text-4xl text-white">rocket_launch</span>
          </div>
          <div class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full animate-pulse"></div>
          <div class="absolute -bottom-1 -left-1 w-3 h-3 bg-green-400 rounded-full animate-pulse delay-500"></div>
        </div>
        
        <h1 class="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
          Welcome to UAT-NG
        </h1>
        <p class="text-xl text-gray-600 font-light tracking-wide">UI Automation Testing, Next-Generation</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
        <div class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <span class="material-symbols-outlined text-white text-xl">folder_special</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Create Test Suites</h3>
          <p class="text-gray-600 leading-relaxed text-sm">Organize your automated tests into logical groups and manage them efficiently.</p>
        </div>
        
        <div class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div class="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <span class="material-symbols-outlined text-white text-xl">psychology</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Intelligent Testing</h3>
          <p class="text-gray-600 leading-relaxed text-sm">Create tests through demonstration or detailed instructions using AI-powered automation.</p>
        </div>
      </div>
      
      <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-xl max-w-3xl mx-auto">
        <h3 class="text-xl font-semibold mb-3">Ready to get started?</h3>
        <p class="text-indigo-100 text-base leading-relaxed">
          Begin by creating your first test suite, then add tests using our intuitive teaching mode or instruction-based creation.
        </p>
      </div>
    </div>
  </div>
</template>
