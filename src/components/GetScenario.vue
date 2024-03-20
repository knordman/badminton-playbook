<script lang="ts">
import { db, playersContextId } from "@/shared/db";
import {
  computeNextScenarioWithWorker,
  gameIsFinished,
  getActiveContext,
} from "@/shared/scenarios";
import { liveQuery } from "dexie";
import { Subscription, from, map } from "rxjs";
import { ref } from "vue";

export default {
  setup() {
    return {
      activeContext: ref<undefined | string>(undefined),
      resultsRegistered: ref<boolean>(false),
      resultsSubscription: ref<Subscription | undefined>(undefined),
      buttonText: ref<string>("Start"),
      computingNext: <boolean>false,
    };
  },

  async mounted() {
    const { activeContext, storedContext } = await db.transaction(
      "r",
      [db.players, db.context],
      async () => {
        const players = await db.players.toArray();
        const activeContext = getActiveContext(players.map((p) => p.name));
        const storedContext = await db.context.get(playersContextId);

        return {
          players,
          storedContext: storedContext?.value,
          activeContext,
        };
      }
    );
    if (activeContext) {
      this.activeContext = activeContext;
    }

    if (storedContext) {
      if (storedContext !== this.activeContext) {
        // players has changed, clear playing
        await db.transaction("rw", [db.playing, db.context], async () => {
          await db.playing.clear();
          await db.context.delete(playersContextId);
        });
      } else {
        // resume playing
        await this.subscribeToResults();
      }
    }
  },

  unmounted() {
    this.unsubscribeResults();
  },

  computed: {
    disabled() {
      return this.resultsSubscription !== undefined
        ? !this.resultsRegistered
        : !this.activeContext;
    },
  },

  methods: {
    async nextScenario() {
      if (this.activeContext && !this.computingNext) {
        try {
          this.computingNext = true; // "debounce"
          this.unsubscribeResults();
          await computeNextScenarioWithWorker();
          await this.subscribeToResults();
        } catch (err) {
          console.error(err);
        } finally {
          this.computingNext = false;
        }
      }
    },
    async subscribeToResults() {
      this.buttonText = "Continue";
      this.resultsRegistered = false;

      const gamesToWatch: number[] = [];
      for (const game of await db.playing.toArray()) {
        if (game.type === "single" || game.type === "double") {
          gamesToWatch.push(game.id!);
        }
      }

      const observer = from(
        liveQuery(() => db.results.where("id").anyOf(gamesToWatch).toArray())
      ).pipe(
        map((results) => {
          if (results.length >= gamesToWatch.length) {
            for (const result of results) {
              if (!gameIsFinished(result)) {
                return false;
              }
            }
            return true;
          }
          return false;
        })
      );
      this.resultsSubscription = observer.subscribe((registered) => {
        this.resultsRegistered = registered;
      });
    },
    unsubscribeResults() {
      this.resultsSubscription?.unsubscribe();
      this.resultsSubscription = undefined;
    },
  },
};
</script>

<template>
  <v-btn
    class="ml-auto"
    variant="elevated"
    :disabled="disabled"
    @click="nextScenario"
    >{{ buttonText }}</v-btn
  >
</template>

<style></style>
