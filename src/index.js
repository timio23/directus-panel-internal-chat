import PanelComponent from './panel.vue';

export default {
	id: 'panel-internal-chat',
	name: 'Internal Chat',
	icon: 'forum',
	description: 'Discuss with other users directly on the dashboard',
	component: PanelComponent,
	options: [
		{
			field: 'chat_collection',
			type: 'string',
			name: '$t:collection',
			meta: {
				interface: 'system-collection',
				options: {
					includeSystem: true,
					includeSingleton: false,
				},
				width: 'half',
				default: 'directus_dashboards',
			},
		},
		{
			field: 'chat_id',
			name: 'Chat ID',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'half',
			},
		},
	],
	minWidth: 18,
	minHeight: 18,
};
