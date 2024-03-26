<script lang="ts">
import { db, playersContextId } from "@/shared/db";

export default {
  methods: {
    async reset(dialogIsActive: { value: boolean }) {
      dialogIsActive.value = false;
      await db.transaction(
        "rw",
        [db.results, db.playing, db.context],
        async () => {
          await db.results.clear();
          await db.playing.clear();
          await db.context.delete(playersContextId);
        }
      );
    },
  },
};
</script>

<template>
  <!-- <v-btn class="ml-auto mr-2" variant="elevated">Export</v-btn> -->
  <v-dialog width="500">
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" class="ml-auto" variant="elevated">Reset</v-btn>
    </template>

    <template v-slot:default="{ isActive }">
      <v-card title="Reset">
        <v-card-text> This will reset all results, are you sure? </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            text="Cancel"
            variant="plain"
            @click="isActive.value = false"
          ></v-btn>

          <v-btn
            color="primary"
            text="Reset"
            variant="tonal"
            @click="reset(isActive)"
          ></v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<style></style>
