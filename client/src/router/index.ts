import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import InterpreterView from '@/views/InterpreterView.vue'
import ComparisonView from '@/views/ComparisonView.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        redirect: '/calculator',
      },
      {
        path: '/calculator/:cvssVector?',
        name: 'Calculator',
        component: InterpreterView,
        props: true,
      },
      {
        path: '/compare',
        name: 'Comparison',
        component: ComparisonView,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
