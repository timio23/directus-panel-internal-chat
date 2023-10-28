<template>
	<div class="internal-chat-panel" :class="{ 'has-header': showHeader }">

		<v-progress-linear v-if="loading" indeterminate />
		<div class="activity-search" v-if="activity">
			<v-icon v-tooltip.bottom="active ? null : t('search')" name="search" class="icon-search" :clickable="!active" />
			<!-- <input v-model="activitySearch" @input="searchActivity" @paste="searchActivity" :placeholder="t('search_items')" /> -->
			<input v-model="activitySearch" @update:model-value="searchActivity" placeholder="Search Chat..." />
			<v-icon
				v-if="activitySearch"
				clickable
				class="icon-empty"
				name="close"
				@click.stop="activitySearch = '';refresh()"
			/>
		</div>
		<div v-if="!collectionPermission" class="empty comments-container">
			<div v-if="!loading" class="message">You are not authorized to access this collection</div>
		</div>
		<div v-else-if="!activityPermission" class="empty comments-container">
			<div v-if="!loading" class="message">You are not authorized to access this chat</div>
		</div>
		<div v-else-if="!activity || activity.length === 0" class="empty comments-container">
			<div v-if="!loading" class="message">{{ t('no_comments') }}</div>
		</div>
		<div class="comments-container" v-else>
			<div class="comments-group" v-for="group in activity" :key="group.date.toString()">
				<div :class="`comment-item ${item.user.id == current_user.id?'right':'left'}`" v-for="item in group.activity" :key="item.id">
					<div class="comment-avatar">
						<v-avatar small>
							<v-image v-if="item.user.avatar" :src="`/assets/${item.user.avatar.id}?key=system-small-cover`" :alt="`${item.user.first_name} ${item.user.last_name}`" />
							<v-icon v-else name="person_outline" />
						</v-avatar>
					</div>
					<div class="comment-body">
						<div class="comment-header">
							<div class="name">
								<user-popover v-if="item.user && item.user.id" :user="item.user.id">
									<span>
										<template v-if="item.user && item.user">
											{{ item.user.first_name }} {{item.user.last_name }}
										</template>

										<template v-else>
											{{ t('private_user') }}
										</template>
									</span>
								</user-popover>
							</div>
						</div>
						<div class="content selectable">
							<div class="comment" v-md="{ value: item.display, target: '_blank' }"></div>
							<div class="comment-footer">
								<div v-if="is_admin || item.user.id == current_user.id" class="comment-actions">
									<v-menu show-arrow placement="bottom-end">
										<template #activator="{ toggle, active }">
											<v-icon class="more" :class="{ active }" name="more_horiz" clickable @click="toggle" />
										</template>

										<v-list>
											<v-list-item clickable @click="edit_comment(item.id, item.comment)">
												<v-list-item-icon><v-icon name="edit" /></v-list-item-icon>
												<v-list-item-content>{{ t('edit') }}</v-list-item-content>
											</v-list-item>
											<v-list-item clickable @click="confirmDelete = true;deleteId = item.id">
												<v-list-item-icon><v-icon name="delete" /></v-list-item-icon>
												<v-list-item-content>{{ t('delete_label') }}</v-list-item-content>
											</v-list-item>
										</v-list>
									</v-menu>
								</div>

								<v-dialog v-model="confirmDelete" @esc="confirmDelete = false">
									<v-card>
										<v-card-title>{{ t('delete_comment') }}</v-card-title>
										<v-card-text>{{ t('delete_are_you_sure') }}</v-card-text>

										<v-card-actions>
											<v-button secondary @click="confirmDelete = false">
												{{ t('cancel') }}
											</v-button>
											<v-button kind="danger" :loading="deleting" @click="remove()">
												{{ t('delete_label') }}
											</v-button>
										</v-card-actions>
									</v-card>
								</v-dialog>

								<div class="time">
									{{ formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) }}
								</div>
							</div>
						</div>
					</div>
				</div>
				<v-divider>{{ group.dateFormatted }}</v-divider>
			</div>
		</div>

		<div class="input-container" v-if="canPost">
			<v-menu v-model="showMentionDropDown" attached>
				<template #activator>
					<v-template-input
						ref="commentElement"
						v-model="newCommentContent"
						capture-group="(@[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})"
						multiline
						trigger-character="@"
						:items="userPreviews"
						:placeholder="t('leave_comment')"
						@trigger="triggerSearch"
						@deactivate="showMentionDropDown = false"
						@up="pressedUp"
						@down="pressedDown"
						@enter="pressedEnter"
						@focus="focused = true"
					/>
				</template>

				<v-list>
					<v-list-item
						v-for="(user, index) in userSearchResult"
						id="suggestions"
						:key="user.id"
						clickable
						:active="index === selectedKeyboardIndex"
						@click="insertUser(user)"
					>
						<v-list-item-icon>
							<v-avatar x-small>
								<v-image v-if="user.avatar" :src="`/assets/${user.avatar.id}?key=system-small-cover`" :alt="userName(user)" />
								<v-icon v-else name="person_outline" />
							</v-avatar>
						</v-list-item-icon>

						<v-list-item-content>{{ userName(user) }}</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>

			<div class="buttons">
				<v-button x-small secondary icon class="mention" @click="insertAt">
					<v-icon name="alternate_email" />
				</v-button>
				<v-emoji-picker @click="saveCursorPosition" @emoji-selected="insertText($event)" />
				<div class="spacer"></div>
				<v-button class="cancel" x-small secondary @click="cancel">
					{{ t('cancel') }}
				</v-button>
				<v-button
					:disabled="!newCommentContent || newCommentContent.length === 0 || newCommentContent.trim() === ''"
					:loading="saving"
					class="post-comment"
					x-small
					@click="postComment"
				>
					<span v-if="editCommentId">Save</span><span v-else>{{ t('submit') }}</span>
				</v-button>
			</div>
		</div>
	</div>
</template>

<script>
import { useApi, useStores } from '@directus/extensions-sdk';
import { isThisYear, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { flatten, groupBy, orderBy, cloneDeep, throttle } from 'lodash';
import { useI18n } from 'vue-i18n';
import { ref, watch } from 'vue';

export default {
	props: {
		showHeader: {
			type: Boolean,
			default: false,
		},
		dashboard: {
			type: String,
		},
		chat_collection: {
			type: String,
			default: 'directus_dashboards',
		},
		chat_id: {
			type: String,
			default: '',
		},
	},
	setup(props){
		const { t } = useI18n();
		const regex = /\s@[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}/gm;
		const api = useApi();
		const { usePermissionsStore, useUserStore, useNotificationsStore } = useStores();

		const { hasPermission } = usePermissionsStore();
		const collectionPermission = hasPermission(props.chat_collection, 'read');
		const activityPermission = hasPermission('directus_activity', 'read');
		const canPost = hasPermission('directus_activity', 'create');

		const userStore = useUserStore();
		const notificationStore = useNotificationsStore();
		const current_user = userStore.currentUser;
		const is_admin = userStore.isAdmin;

		const showMentionDropDown = ref(false);

		const comment_collection = props.chat_collection ? props.chat_collection : 'directus_dashboards';
		const editCommentId = ref('');
		const newCommentContent = ref('');
		const selectedKeyboardIndex = ref(0);
		const focused = ref(false);
		const saving = ref(false);
		const deleteId = ref('');
		let triggerCaretPosition = 0;

		const userSearchResult = ref([]);
		let awaitingSearch = false;

		const commentElement = ref();
		let lastCaretPosition = 0;
		let lastCaretOffset = 0;

		const activitySearch = ref('');
		const { activity, loading, refresh, count, userPreviews } = useActivity(comment_collection, props.chat_id);

		setInterval(refresh, 60000);

		function edit_comment(comment_id, comment){
			editCommentId.value = comment_id;
			newCommentContent.value = comment;
		}

		function insertUser(user) {
			const text = newCommentContent.value?.replaceAll(String.fromCharCode(160), ' ');
			if (!text) return;

			let countBefore = triggerCaretPosition - 1;
			let countAfter = triggerCaretPosition;

			if (text.charAt(countBefore) !== ' ' && text.charAt(countBefore) !== '\n') {
				while (countBefore >= 0 && text.charAt(countBefore) !== ' ' && text.charAt(countBefore) !== '\n') {
					countBefore--;
				}
			}

			while (countAfter < text.length && text.charAt(countAfter) !== ' ' && text.charAt(countAfter) !== '\n') {
				countAfter++;
			}

			const before = text.substring(0, countBefore + (text.charAt(countBefore) === '\n' ? 1 : 0));
			const after = text.substring(countAfter);

			newCommentContent.value = before + ' @' + user.id + after;
		}

		function triggerSearch({ searchQuery, caretPosition }) {
			triggerCaretPosition = caretPosition;

			showMentionDropDown.value = true;
			loadUsers(searchQuery);
			selectedKeyboardIndex.value = 0;
		}

		function useActivity(collection, primaryKey) {
			const activity = ref(null);
			const count = ref(0);
			const error = ref(null);
			const loading = ref(false);
			const userPreviews = ref({});

			getActivity();

			return { activity, error, loading, refresh, count, userPreviews };

			async function getActivity() {
				error.value = null;
				loading.value = true;

				let query_params = {
					params: {
						sort: '-id', // directus_activity has auto increment and is therefore in chronological order
						// search: activitySearch.value ? activitySearch.value : '', // Does not search users
						fields: [
							'id',
							'action',
							'timestamp',
							'user.id',
							'user.email',
							'user.first_name',
							'user.last_name',
							'user.avatar.id',
							'revisions.id',
							'comment',
						],
						'filter[_and][0][collection][_eq]': collection,
						'filter[_and][1][item][_eq]': primaryKey,
						'filter[_and][2][action][_eq]': 'comment',
					},
				};
				if(activitySearch.value){
					query_params.params['filter[_and][3][_or][0][comment][_contains]'] = activitySearch.value;
					query_params.params['filter[_and][3][_or][1][user][email][_contains]'] = activitySearch.value;
					query_params.params['filter[_and][3][_or][2][user][first_name][_contains]'] = activitySearch.value;
					query_params.params['filter[_and][3][_or][3][user][last_name][_contains]'] = activitySearch.value;
				}

				try {
					const response = await api.get(`/activity`, query_params);

					count.value = response.data.data.length;

					await loadUserPreviews(response.data.data, regex).then((loadedUserPreviews) => {
						//console.log(loadedUserPreviews);
						userPreviews.value = loadedUserPreviews;

						const activityWithUsersInComments = (response.data.data).map((comment) => {
							const display = (comment.comment).replace(
								regex,
								(match) => {
									let match_id = match.substring(2);
									let match_name = loadedUserPreviews[match_id];
									console.log(match_id);
									console.log(loadedUserPreviews[match_id]);
									return `<mark>${match_name}</mark>`
								}
							);

							//const display = comment.comment;

							return {
								...comment,
								display,
							};
						});

						const activityByDate = groupBy(activityWithUsersInComments, (activity) => {
							const date = new Date(new Date(activity.timestamp).toDateString());
							return date;
						});

						const activityGrouped = ref([]);

						for (const [key, value] of Object.entries(activityByDate)) {
							const date = new Date(key);
							const today = isToday(date);
							const yesterday = isYesterday(date);
							const thisYear = isThisYear(date);

							let dateFormatted = '';

							if (today) dateFormatted = t('today');
							else if (yesterday) dateFormatted = t('yesterday');
							else if (thisYear) dateFormatted = localizedFormat(date, String(t('date-fns_date_short_no_year')));
							else dateFormatted = localizedFormat(date, String(t('date-fns_date_short')));

							activityGrouped.value.push({
								date: date,
								dateFormatted: String(dateFormatted),
								activity: value,
							});
						}

						activity.value = orderBy(activityGrouped.value, ['date'], ['desc']);
					});
					
				} catch (error) {
					console.error(error);
					error.value = error;
				} finally {
					loading.value = false;
				}
			}

			async function refresh() {
				await getActivity();
			}
		}

		async function loadUserPreviews(comments, regex) {
			const usersInComments = ref([]);

			comments.forEach((comment) => {
				usersInComments.value.push(comment.comment.match(regex));
			});

			const uniqIds = [...new Set(flatten(usersInComments.value))].filter((id) => {
				if (id) return id;
			});

			if (uniqIds.length > 0) {
				const response = await api.get('/users', {
					params: {
						filter: { id: { _in: uniqIds.map((id) => id.substring(2)) } },
						fields: ['first_name', 'last_name', 'email', 'id'],
					},
				});

				const userPreviews = ref({});

				response.data.data.map((user) => {
					userPreviews.value[user.id] = userName(user);
				});

				return userPreviews.value;
			}

			return {};
		}

		const { confirmDelete, deleting, remove } = useDelete();

		function useDelete() {
			const confirmDelete = ref(false);
			const deleting = ref(false);

			return { confirmDelete, deleting, remove };

			async function remove() {
				deleting.value = true;

				try {
					await api.delete(`/activity/comment/${deleteId.value}`);
					await refresh();
					deleteId.value = '';
					confirmDelete.value = false;
				} catch (err) {
					console.log(err);
				} finally {
					deleteId.value = '';
					deleting.value = false;
				}
			}
		}

		async function postComment() {
			if (newCommentContent.value === null || newCommentContent.value.length === 0) return;
			saving.value = true;

			try {
				if(editCommentId.value){
					await api.patch(`/activity/comment/${editCommentId.value}`, {
						comment: newCommentContent.value,
					});
				} else {
					await api.post(`/activity/comment`, {
						collection: comment_collection,
						item: props.chat_id,
						comment: newCommentContent.value,
					});
				}

				refresh();

				notificationStore.add({
					title: editCommentId.value ? t('post_comment_updated') : t('post_comment_success'),
				});
				
				editCommentId.value = '';
				newCommentContent.value = '';

			} catch (err) {
				console.log(err);
			} finally {
				saving.value = false;
			}
		}

		function cancel() {
			editCommentId.value = '';
			newCommentContent.value = '';
			focused.value = false;
		}

		function userName(user) {
			if (!user) {
				return 'Unknown User';
			}

			if (user.first_name && user.last_name) {
				return `${user.first_name} ${user.last_name}`;
			}

			if (user.first_name) {
				return user.first_name;
			}

			if (user.email) {
				return user.email;
			}

			return 'Unknown User';
		}

		const loadUsers = throttle(async (name) => {

			let user_regex = /\s@[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/gi;

			let filter = {
				_or: [
					{
						first_name: {
							_starts_with: name,
						},
					},
					{
						last_name: {
							_starts_with: name,
						},
					},
					{
						email: {
							_starts_with: name,
						},
					},
				],
			};

			if (name.match(user_regex)) {
				filter = {
					id: {
						_in: name,
					},
				};
			}

			try {
				const result = await api.get('/users', {
					params: {
						filter: name === '' || !name ? undefined : filter,
						fields: ['first_name', 'last_name', 'email', 'id', 'avatar'],
					},
				});

				const newUsers = cloneDeep(userPreviews.value);

				result.data.data.forEach((user) => {
					newUsers[user.id] = userName(user);
				});

				userPreviews.value = newUsers;
				userSearchResult.value = result.data.data;
			} catch (e) {
				console.error(e);
				return e;
			}
		}, 200);

		function pressedUp() {
			if (selectedKeyboardIndex.value > 0) {
				selectedKeyboardIndex.value--;
			}
		}

		function pressedDown() {
			if (selectedKeyboardIndex.value < userSearchResult.value.length - 1) {
				selectedKeyboardIndex.value++;
			}
		}

		function pressedEnter() {
			insertUser(searchResult.value[selectedKeyboardIndex.value]);
			showMentionDropDown.value = false;
		}

		function saveCursorPosition() {
			if (document.getSelection) {
				const selection = document.getSelection();

				if (selection && selection.rangeCount > 0) {
					lastCaretOffset = selection.anchorOffset;

					const range = selection?.getRangeAt(0);
					range?.setStart(commentElement.value?.$el, 0);
					lastCaretPosition = range?.cloneContents().textContent?.length ?? 0;

					selection.removeAllRanges();
				}
			}
		}

		function insertAt() {
			saveCursorPosition();
			document.getSelection()?.removeAllRanges();
			insertText(' @');
		}

		function insertText(text) {
			if (newCommentContent.value === null) {
				lastCaretPosition = 0;
				newCommentContent.value = '';
			}

			newCommentContent.value = [
				newCommentContent.value.slice(0, lastCaretPosition),
				text,
				newCommentContent.value.slice(lastCaretPosition),
			].join('');

			setTimeout(() => {
				commentElement.value?.$el.focus();
				document.getSelection()?.setPosition(document.getSelection()?.anchorNode ?? null, lastCaretOffset + text.length);

				const inputEvent = new Event('input', { bubbles: true });
				commentElement.value?.$el.dispatchEvent(inputEvent);
			}, 10);
		}

		function searchActivity(){
			if (!awaitingSearch) {
				setTimeout(() => {
					refresh();
					awaitingSearch = false;
				}, 1000); // 1 sec delay
			}
			awaitingSearch = true;
		}

		watch(
			[
				() => props.chat_collection,
				() => props.chat_id,
			],
			() => {
				comment_collection.value = props.chat_collection;
				refresh();
			},
		);

		return {
			t,
			loading,
			formatDistanceToNow,
			userName,

			// Permissions
			current_user,
			collectionPermission,
			activityPermission,
			canPost,
			is_admin,

			// Comments
			activity,
			activitySearch,
			searchActivity,
			refresh,
			count,
			
			// Users
			userPreviews,

			// Create Comment
			commentElement,
			newCommentContent,
			focused,
			cancel,
			postComment,
			saving,
			editCommentId,

			// Edit Comment
			edit_comment,

			// Delete Comment
			confirmDelete,
			deleting,
			deleteId,
			remove,

			// Mentions and Emojis
			pressedUp,
			pressedDown,
			pressedEnter,
			saveCursorPosition,
			selectedKeyboardIndex,
			triggerSearch,
			userSearchResult,
			showMentionDropDown,
			insertUser,
			insertText,
			insertAt,
		};
	},
};
</script>

<style scoped>
.internal-chat-panel {
	padding: 12px;
	display: flex;
	flex-direction: column;
	height: 100%;
	background-color: var(--background-normal);
}

.internal-chat-panel.has-header {
	padding: 0 12px 12px;
}

.activity-search {
	position: absolute;
	right: 12px;
	top: 12px;
	z-index: 1;
	display: flex;
	align-items: center;
	width: 200px;
	max-width: 100%;
	height: 44px;
	overflow: hidden;
	border: 2px solid var(--border-normal);
	border-radius: 22px;
	background-color: var(--background-input);
}

.activity-search .icon-search {
	margin: 0 4px 0 8px;
}

.activity-search .icon-empty {
	margin-right: 8px;
}

.activity-search input {
	flex-grow: 1;
	width: 0px;
	height: 100%;
	margin: 0;
	padding: 0;
	overflow: hidden;
	color: var(--foreground-normal);
	text-overflow: ellipsis;
	background-color: var(--background-input);
	border: none;
	border-radius: 0;
}

.comments-container {
	flex-grow: 1;
	flex-shrink: 1;
	overflow-y: scroll;
	padding-top: 4em;
	height: 100%;
}

.comments-container,
.comments-group {
	display: flex;
	flex-direction: column-reverse;
}

.comments-container.empty {
	align-items: center;
	justify-content: center;
}

.comment-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	text-align: left;
	margin-bottom: 0.2em;
}

.comment-header .name {
	flex-grow: 1;
	font-weight: 600;
	font-size: 12px;
	line-height: 1.3;
}

.comment-item.right .comment-header {
	text-align: right;
	flex-direction: row-reverse;
}

.comment-item .v-avatar {
	--v-avatar-color: var(--background-normal-alt);
	flex-basis: 24px;
	margin-right: 8px;
}

.comment-item.right .v-avatar {
  margin-right: 0;
  margin-left: 8px;
}

.comment-item .v-avatar .v-icon {
	--v-icon-color: var(--foreground-subdued);
	--v-icon-color: var(--theme--foreground-subdued);
}

.comment-actions {
	position: relative;
	flex-basis: 24px;
	color: var(--foreground-subdued);
	color: var(--theme--foreground-subdued);
}
.comment-actions .more {
	cursor: pointer;
	/* opacity: 0; */
	margin: 0 8px 0 -4px;
	transition: all var(--slow) var(--transition);
}

.comment-item.right .comment-actions .more {
	margin: 0 -4px 0 8px;
	color: white;
}
.comment-actions .more:hover {
	color: var(--foreground);
	color: var(--theme--foreground);
}

.comment-footer {
	background-color: var(--background-subdued);
	padding: 0em 0.75em;
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.comment-item.right .comment-footer {
	background-color: rgba(0,0,0,0.1);
	flex-direction: row-reverse;
}

.comment-footer .time {
	font-size: 12px;
	white-space: nowrap;
	text-align: right;
	text-transform: lowercase;
	opacity: 1;
	transition: opacity var(--slow) var(--transition);
	pointer-events: none;
	line-height: 24px;
}

.comment-item.right .comment-footer .time {
	text-align: left;
}

.comment-header .comment-actions .more.active + .time {
	opacity: 0;
}
.action-delete {
	--v-button-background-color: var(--danger-25);
	--v-button-color: var(--danger);
	--v-button-color: var(--theme--danger);
	--v-button-background-color-hover: var(--danger-50);
	--v-button-color-hover: var(--danger);
	--v-button-color-hover: var(--theme--danger);
}

.dot {
	display: inline-block;
	width: 6px;
	height: 6px;
	margin-right: 4px;
	vertical-align: middle;
	background-color: var(--warning);
	background-color: var(--theme--warning);
	border-radius: 3px;
}

.comment-item {
	position: relative;
	display: flex;
	margin-bottom: 8px;
	padding: 1em 0 0 0;
	border-radius: var(--border-radius);
}

.comment-item .comment-body {
	flex-grow: 1;
}

.comment-item.right {
	flex-direction: row-reverse;
	margin-left: 4em;
}

.comment-item.left {
	margin-right: 4em;
}

.comment-item:last-of-type {
	margin-bottom: 8px;
}

.comment-item .content {
	display: inline-block;
	max-width: 100%;
	margin-bottom: -6px;
	line-height: 1.4;
	background-color: var(--background-page);
	border-radius: 0.5em;
	overflow: hidden;
}

.comment-item .content .comment {
	padding: 0.5em 0.75em 0.5em;
	text-align: left;
}

.comment-item.right .comment-body {
	text-align: right;
}
.comment-item.right .content {
	background-color: var(--primary);
	color: white;
}

.comment-item .comment :deep(> *:first-child),
.comment-item .comment :deep(p > *:first-child) {
	margin-top: 0;
}

.comment-item .comment :deep(> *:last-child),
.comment-item .comment :deep(p > *:last-child) {
	margin-bottom: 0;
}

.comment-item .comment :deep(a) {
	color: var(--primary);
	color: var(--theme--primary);
}

.comment-item .comment :deep(blockquote) {
	margin: 8px 0;
	padding-left: 6px;
	color: var(--foreground-subdued);
	color: var(--theme--foreground-subdued);
	font-style: italic;
	border-left: 2px solid var(--border-normal);
}

.comment-item .comment :deep(img) {
	max-width: 100%;
	margin: 8px 0;
	border-radius: var(--border-radius);
	display: block;
}

.comment-item .comment :deep(hr) {
	height: 2px;
	margin: 12px 0;
	border: 0;
	border-top: 2px solid var(--border-normal);
}

.comment-item .comment :deep(mark) {
	display: inline-block;
	color: var(--primary);
	line-height: 1;
	background: none;
	user-select: text;
	pointer-events: none;
}

.comment-item.right .comment :deep(mark) {
	color: white;
	font-weight: bold;
}

.comment-item .comment :deep(pre) {
	padding: 2px 4px;
	color: var(--foreground-normal);
	color: var(--theme--foreground);
	background-color: var(--background-normal);
	border-radius: var(--border-radius);
	margin: 2px 0;
	font-family: var(--family-monospace);
	font-family: var(--theme--font-family-monospace);
	white-space: nowrap;
	max-width: 100%;
	overflow-x: auto;
}

.comment-item .comment :deep(code) {
	padding: 2px 4px;
	color: var(--foreground-normal);
	color: var(--theme--foreground);
	background-color: var(--background-normal);
	border-radius: var(--border-radius);
	margin: 2px 0;
	font-family: var(--family-monospace);
	font-family: var(--theme--font-family-monospace);
}

.comment-item .comment :deep(pre > code) {
	padding: 0;
	margin: 0;
	white-space: pre;
}

.comment-item .comment :deep(:is(h1, h2, h3, h4, h5, h6)) {
	margin-top: 12px;
	font-weight: 600;
	font-size: 16px;
	color: var(--foreground-normal-alt);
	color: var(--theme--foreground-accent);
}

.comment-item.expand .content::after {
	position: absolute;
	right: 0;
	bottom: 4px;
	left: 0;
	z-index: 1;
	height: 40px;
	background: linear-gradient(
		180deg,
		rgb(var(--background-page-rgb), 0) 0%,
		rgb(var(--background-page-rgb), 0.8) 25%,
		rgb(var(--background-page-rgb), 1) 100%
	);
	content: '';
}

.comment-item.expand .content .expand-text {
	position: absolute;
	right: 0;
	bottom: 8px;
	left: 0;
	z-index: 2;
	height: 24px;
	text-align: center;
	cursor: pointer;
}

.comment-item.expand .content .expand-text span {
	padding: 4px 12px 5px;
	color: var(--foreground-subdued);
	color: var(--theme--foreground-subdued);
	font-weight: 600;
	font-size: 12px;
	background-color: var(--background-normal);
	border-radius: 12px;
	transition: color var(--fast) var(--transition), background-color var(--fast) var(--transition);
}

.comment-item.expand .content .expand-text:hover span {
	color: var(--foreground-inverted);
	background-color: var(--primary);
	background-color: var(--theme--primary);
}

.user-name {
	color: var(--primary);
	color: var(--theme--primary);
}

.buttons {
	position: absolute;
	right: 8px;
	bottom: 8px;
}

.cancel {
	margin-right: 4px;
}

.input-container {
	position: relative;
	padding: 0px;
}

.v-template-input.multiline {
	height: auto;
	padding-bottom: 3em;
	transition: height var(--fast) var(--transition), padding var(--fast) var(--transition);
}

.buttons {
	margin-top: 4px;
	display: flex;
	gap: 4px;
}

.buttons .mention,
.buttons .emoji-button {
	--v-button-background-color: transparent;
	--v-button-color: var(--foreground-subdued);
	--v-button-color: var(--theme--foreground-subdued);
	--v-button-color-hover: var(--primary);
	--v-button-color-hover: var(--theme--primary);
}

.buttons .cancel {
	--v-button-color: var(--foreground-subdued);
	--v-button-color: var(--theme--foreground-subdued);
}

.buttons .post-comment {
	--v-button-background-color-disabled: var(--background-normal-alt);
}

.collapsed:not(:focus) .buttons {
	display: none;
}

.spacer {
	flex-grow: 1;
}

#suggestions {
	display: flex;
	flex-direction: row;
	overflow-x: hidden;
}
</style>
