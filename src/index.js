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
			schema: {
				default_value: 'directus_dashboards',
			},
			meta: {
				interface: 'system-collection',
				required: true,
				options: {
					includeSystem: true,
					includeSingleton: true,
				},
				width: 'half',
			},
		},
		{
			field: 'chat_id',
			name: 'Chat ID',
			type: 'string',
			scheme: {
				default_value: `chat_${Math.random().toString(20).substr(2, 6)}`,
			},
			meta: {
				interface: 'input',
				required: true,
				width: 'half',
			},
		},
	],
	minWidth: 18,
	minHeight: 18,
};
