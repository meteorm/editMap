import Vue from 'vue';
import Router from 'vue-router';
import EditImage from '@/contents/main/main';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'EditImage',
      component: EditImage,
    },
  ],
});
