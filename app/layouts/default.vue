<template>
  <div class="min-h-screen bg-white flex flex-col">
    <div class="flex-1">
      <slot />
    </div>
    <footer class="py-4 text-center text-xs text-gray-400">
      Zeus es propiedad de
      <a href="https://www.mauloasan.com" target="_blank" rel="noopener" class="text-gray-500 hover:text-gray-700">Mauloasan</a>.
    </footer>
  </div>
</template>
