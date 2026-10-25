<template>
    <div class="text-carousel" v-if="items.length > 0">
        <div class="text-carousel-wrapper">
            <div class="text-carousel-track" :style="{ '--index': currentIndex }">
                <div v-for="(item, index) in items" :key="index" class="text-carousel-item">
                    {{ item.text }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
    items: {
        type: Array,
        default: () => []
    },
    interval: {
        type: Number,
        default: 3000
    }
})

const itemsData = ref(props.items)
const currentIndex = ref(0)
let timer = null

watch(() => props.items, (newVal) => {
    itemsData.value = newVal
    currentIndex.value = 0
}, { immediate: true })

const nextItem = () => {
    if (itemsData.value.length === 0) return
    currentIndex.value = (currentIndex.value + 1) % itemsData.value.length
}

const startAutoPlay = () => {
    if (itemsData.value.length <= 1) return
    timer = setInterval(nextItem, props.interval)
}

onMounted(() => {
    startAutoPlay()
})

onUnmounted(() => {
    if (timer) clearInterval(timer)
})
</script>

<style scoped>
.text-carousel {
    margin: 1rem 0;
}

.text-carousel-wrapper {
    position: relative;
    overflow: hidden;
    height: 40px;
    /* 固定高度，正好一条文字 */
    line-height: 40px;
    background: var(--vp-c-bg-soft);
    border-radius: 8px;
    border: 1px solid var(--vp-c-divider);
}

.text-carousel-track {
    /* 每一条的高度：移动端会覆盖成 36px，位移必须跟着变，否则会露出下一条 */
    --item-h: 40px;
    transform: translateY(calc(-1 * var(--index, 0) * var(--item-h)));
    transition: transform 0.4s ease-in-out;
    will-change: transform;
}

.text-carousel-item {
    height: 40px;
    padding: 0 16px;
    font-size: 0.9rem;
    color: var(--vp-c-text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 移动端适配 */
@media (max-width: 640px) {
    .text-carousel-wrapper {
        height: 36px;
        line-height: 36px;
    }

    .text-carousel-track {
        --item-h: 36px;
    }

    .text-carousel-item {
        height: 36px;
        font-size: 0.85rem;
        padding: 0 12px;
    }
}
</style>