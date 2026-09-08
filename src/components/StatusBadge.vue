<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_COLOR } from '@/lib/permissions'
import type { PurchaseRequestStatus } from '@/lib/kuroco/types'

const props = defineProps<{ status: PurchaseRequestStatus | string }>()
const cls = computed(() => STATUS_COLOR[props.status as PurchaseRequestStatus] ?? 'bg-slate-100 text-slate-600')
</script>

<template>
  <span class="badge" :class="cls">{{ status }}</span>
</template>
