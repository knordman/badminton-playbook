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
    async downloadCsv() {
      const results = await db.results.toArray();
      const headers = ["Type", "Players", "", "", "", "Score", ""];
      const rows: string[] = [];
      for (const r of results) {
        if (!r.finished || r.type === "break") {
          continue;
        }

        const row: (string | number)[] = [r.type === "single" ? "Single" : "Double"];

        if (r.type === "single") {
          row.push(r.players[0], "", r.players[1], "");
        } else if (r.type === "double") {
          row.push(r.players[0][0], r.players[0][1], r.players[1][0], r.players[1][1]);
        }

        row.push(r.points[0], r.points[1]);
        rows.push(row.join(";"));
      }

      const content = [headers.join(";"), ...rows].join("\n");
      const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `badminton_stats_${new Date().toJSON().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  },
};
</script>

<template>
  <v-btn class="ml-auto mr-2" variant="elevated" @click="downloadCsv">Download</v-btn>
  <v-dialog width="500">
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" class="ml-auto" variant="elevated">Reset</v-btn>
    </template>

    <template v-slot:default="{ isActive }">
      <v-card title="Reset">
        <v-card-text> This will reset all results, are you sure? </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn text="Cancel" variant="plain" @click="isActive.value = false"></v-btn>

          <v-btn color="primary" text="Reset" variant="tonal" @click="reset(isActive)"></v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<style></style>
