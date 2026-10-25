// https://vitepress.dev/guide/custom-theme
import { h } from "vue";
import Theme from 'vitepress/theme' // https://vitepress.dev/zh/guide/extending-default-theme#using-different-fonts
// 引入组件库的少量全局样式变量
import 'tdesign-vue-next/es/style/index.css';

import "./style.css";
import Comment from "./components/Comment.vue";
import LikeButton from "./components/LikeButton.vue";
import GalleryViewer from "./components/GalleryViewer.vue";
import ImageViewer from "./components/ImageViewer.vue"
import GoBack from "./components/GoBack.vue";
import NotePanel from "./components/NotePanel.vue";

export default {
	...Theme,
	Layout: () => {
		return h(Theme.Layout, null, {
			// https://vitepress.dev/guide/extending-default-theme#layout-slots
			"doc-after": () => [h(LikeButton), h(Comment)],
			"doc-top": () => h(ImageViewer),
			"aside-top": () => h(GoBack),
		});
	},

	enhanceApp({ app }: any) {
		app.component("Comment", Comment);
		app.component("LikeButton", LikeButton);
		app.component("GalleryViewer", GalleryViewer);
		app.component("ImageViewer", ImageViewer);
		app.component("GoBack", GoBack);
		app.component("NotePanel", NotePanel);
	},
};
