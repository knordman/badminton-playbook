<script lang="ts">
import { db, playersContextId } from "@/shared/db";
import { statsMode, cycleStatsMode } from "@/shared/statsMode";

function today() {
  return new Date().toJSON().split("T")[0];
}

function saveFile(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default {
  setup() {
    return { statsMode, cycleStatsMode };
  },
  data() {
    return { resetDialog: false };
  },
  methods: {
    async reset() {
      this.resetDialog = false;
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
      saveFile(content, "text/csv;charset=utf-8;", `badminton_stats_${today()}.csv`);
    },
    async downloadDatabase() {
      const dump = await db.transaction("r", db.tables, async () => {
        const entries = await Promise.all(
          db.tables.map(async (table) => [table.name, await table.toArray()] as const)
        );
        return Object.fromEntries(entries);
      });
      saveFile(
        JSON.stringify(dump, undefined, 2),
        "application/json;charset=utf-8;",
        `badminton_db_${today()}.json`
      );
    },
  },
};
</script>

<template>
  <v-chip rounded="xl" label color="blue" @click="cycleStatsMode">
    {{ statsMode }}
  </v-chip>
  <v-menu location="bottom end">
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" class="ml-auto mr-2" icon="mdi-dots-vertical" title="More"></v-btn>
    </template>
    <v-list density="compact">
      <v-list-item prepend-icon="mdi-download" title="Download stats as CSV" @click="downloadCsv"></v-list-item>
      <v-list-item prepend-icon="mdi-bug" title="Download database as JSON" @click="downloadDatabase"></v-list-item>
      <v-list-item prepend-icon="mdi-delete" title="Reset" @click="resetDialog = true"></v-list-item>
    </v-list>
  </v-menu>
  <v-dialog v-model="resetDialog" width="500">
    <v-card title="Reset">
      <v-card-text> This will reset all results, are you sure? </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn text="Cancel" variant="plain" @click="resetDialog = false"></v-btn>

        <v-btn color="primary" text="Reset" variant="tonal" @click="reset"></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
