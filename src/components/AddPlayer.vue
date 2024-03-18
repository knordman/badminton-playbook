<script lang="ts">
import { db } from "@/shared/db";

export default {
  data() {
    return {
      input: {
        name: "",
      },
      errors: {
        name: "",
      },
    };
  },

  methods: {
    async addPlayer(dialogIsActive: { value: boolean }) {
      if (!this.input.name) {
        this.errors.name = "Name is required";
      } else {
        const query = db.players.where("name").equals(this.input.name);
        const count = await query.count();
        if (count > 0) {
          this.errors.name = `${this.input.name} has already been added`;
        } else {
          await db.players.add({ name: this.input.name });
          this.input.name = "";
          this.errors.name = "";
          // dialogIsActive.value = false;
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
            v-model="input.name"
            label="Name"
            :error-messages="errors.name"
          ></v-text-field>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            text="Close"
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
