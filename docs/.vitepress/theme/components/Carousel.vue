<template>
    <div class="carousel-container" v-if="slides.length > 0">
        <div class="carousel-wrapper">
            <div class="carousel-slides" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
                <div v-for="(slide, index) in slides" :key="index" class="carousel-slide"
                    :style="{ '--slide-image': `url(${slide.image})` }">
                    <img :src="slide.image" :alt="slide.text" loading="lazy" />
                    <div class="carousel-caption">
                        <span class="carousel-text">{{ slide.text }}</span>
                    </div>
                </div>
            </div>

            <!-- 指示器 -->
            <div class="carousel-indicators" v-if="slides.length > 1">
                <button v-for="(_, index) in slides" :key="index" :class="{ active: currentIndex === index }"
                    @click.stop="goToSlide(index)"></button>
            </div>

            <!-- 左右箭头 -->
            <button v-if="slides.length > 1" class="carousel-arrow prev" @click.stop="prevSlide">
                ‹
            </button>
            <button v-if="slides.length > 1" class="carousel-arrow next" @click.stop="nextSlide">
                ›
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
    slides: {
        type: Array,
        default: () => []
    }
})

const slidesData = ref(props.slides)

watch(() => props.slides, (newVal) => {
    slidesData.value = newVal
}, { immediate: true })

const currentIndex = ref(0)
let autoPlayTimer = null

const nextSlide = () => {
    currentIndex.value = (currentIndex.value + 1) % slidesData.value.length
    resetAutoPlay()
}

const prevSlide = () => {
    currentIndex.value = (currentIndex.value - 1 + slidesData.value.length) % slidesData.value.length
    resetAutoPlay()
}

const goToSlide = (index) => {
    currentIndex.value = index
    resetAutoPlay()
}

const startAutoPlay = () => {
    if (slidesData.value.length <= 1) return
    autoPlayTimer = setInterval(() => {
        nextSlide()
    }, 2000)
}

const resetAutoPlay = () => {
    if (autoPlayTimer) {
        clearInterval(autoPlayTimer)
        startAutoPlay()
    }
}

onMounted(() => {
    startAutoPlay()
})

onUnmounted(() => {
    if (autoPlayTimer) {
        clearInterval(autoPlayTimer)
    }
})

</script>

<style scoped>
.carousel-container {
    margin: 1rem 0 2rem;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.carousel-wrapper {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 9;
    background: var(--vp-c-bg-alt);
}

.carousel-slides {
    display: flex;
    width: 100%;
    height: 100%;
    transition: transform 0.5s ease-in-out;
}

.carousel-slide {
    flex-shrink: 0;
    width: 100%;
    height: 100%;
    position: relative;
    cursor: default;
}

.carousel-slide::before {
    content: '';
    position: absolute;
    inset: -12%;
    background-image: var(--slide-image);
    background-size: cover;
    background-position: center;
    filter: blur(26px) saturate(1.15);
    opacity: 0.55;
    transform: scale(1.05);
}

.carousel-slide img {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.carousel-caption {
    z-index: 2;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
    padding: 2rem 1rem 1rem;
    text-align: center;
}

.carousel-text {
    color: white;
    font-size: 1.1rem;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 指示器 */
.carousel-indicators {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    z-index: 10;
}

.carousel-indicators button {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    border: none;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s;
}

.carousel-indicators button.active {
    width: 24px;
    border-radius: 4px;
    background: white;
}

/* 左右箭头 */
.carousel-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    z-index: 10;
}

.carousel-arrow:hover {
    background: rgba(0, 0, 0, 0.7);
}

.carousel-arrow.prev {
    left: 12px;
}

.carousel-arrow.next {
    right: 12px;
}

/* 移动端适配 */
@media (max-width: 640px) {
    .carousel-text {
        font-size: 0.85rem;
    }

    .carousel-arrow {
        width: 28px;
        height: 28px;
        font-size: 20px;
    }

    .carousel-caption {
        padding: 1rem 0.75rem 0.75rem;
    }
}
</style>