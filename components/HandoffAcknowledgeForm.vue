<template>
  <div class="modal-overlay" @click="close">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>ハンドオフ確認</h2>
        <button class="btn-close" @click="close">×</button>
      </div>

      <form @submit.prevent="submit" class="form">
        <div class="form-group">
          <label>確認タイプ *</label>
          <select v-model="form.acknowledgeType" required>
            <option value="">選択してください</option>
            <option value="CHECK_IN">チェックイン</option>
            <option value="CHECK_OUT">チェックアウト</option>
            <option value="PARTIAL_CONFIRM">部分確認</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>チェック済みタスク</label>
            <input v-model.number="form.checkedItems" type="number" min="0" :max="totalTasks" />
          </div>
          <div class="form-group">
            <label>全タスク</label>
            <input v-model.number="form.totalItems" type="number" :value="totalTasks" disabled />
          </div>
        </div>

        <div class="form-group">
          <label>コメント (オプション)</label>
          <textarea v-model="form.comments" placeholder="確認に関するコメント"></textarea>
        </div>

        <div class="form-group">
          <label>署名画像URL (オプション)</label>
          <input v-model="form.signatureUrl" type="url" placeholder="署名画像のURL" />
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="close">キャンセル</button>
          <button type="submit" class="btn-submit">確認完了</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  handoffId: string
  totalTasks: number
}>()

const emit = defineEmits<{
  close: []
  submit: [data: any]
}>()

const form = ref({
  acknowledgeType: '',
  checkedItems: 0,
  totalItems: 0,
  comments: '',
  signatureUrl: '',
})

const submit = () => {
  emit('submit', form.value)
}

const close = () => {
  emit('close')
}
</script>

<style scoped lang="css">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #333;
}

.form {
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 5px;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.form-group input:disabled {
  background: #f5f5f5;
  color: #999;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.btn-cancel,
.btn-submit {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-cancel {
  background: #f0f0f0;
  color: #333;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-submit {
  background: #007bff;
  color: white;
}

.btn-submit:hover {
  background: #0056b3;
}
</style>
