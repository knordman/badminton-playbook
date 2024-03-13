<script lang="ts">
import { db } from "@/shared/db";
import { ref } from "vue";

export default {
  setup() {
    return {
      name: ref<string>(""),
      error: ref<string | undefined>(undefined),
      addAnother: ref<boolean>(true),
    };
  },

  methods: {
    async addPlayer(dialogIsActive: { value: boolean }) {
      if (!this.name) {
        this.error = "Name is required";
      } else {
        const query = db.players.where("name").equals(this.name);
        const count = await query.count();
        if (count > 0) {
          this.error = `${this.name} has already been added`;
        } else {
          await db.players.add({ name: this.name });
          this.name = "";
          this.error = "";
          if (!this.addAnother) {
            dialogIsActive.value = false;
          }
        }
      }
    },
  },
};
</script>

<template>
  <v-dialog width="500">
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" class="ml-auto" variant="elevated"
        >Add player</v-btn
      >
    </template>

    <template v-slot:default="{ isActive }">
      <v-card title="Add player">
        <v-card-text>
          <v-text-field
            v-model="name"
            label="Name"
            :error-messages="error"
          ></v-text-field>
          <v-checkbox label="Add another after this one" v-model="addAnother"></v-checkbox>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text="Cancel"
            variant="plain"
            @click="isActive.value = false"
          ></v-btn>
          <v-btn
            color="primary"
            text="Add"
            variant="tonal"
            @click="addPlayer(isActive)"
          ></v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<style></style>
