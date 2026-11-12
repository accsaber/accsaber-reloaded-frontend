<template>
  <div class="market-ghost card-ghost placeholder" aria-hidden="true" />
</template>

<style scoped>
.market-ghost {
  --ghost-body: 152px;
}

@media (max-width: 767px) {
  .market-ghost {
    --ghost-body: 0px;
    height: 135px;
  }

  .market-ghost::before {
    display: none;
  }
}
</style>
