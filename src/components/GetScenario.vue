<script lang="ts">
import { db } from "@/shared/db";
import { getNext, isPlayable, type Result } from "@/shared/scenario";
import { liveQuery } from "dexie";
import { Subscription, from, map } from "rxjs";
import { ref } from "vue";

const enum Mode {
  START = "Start",
  CONTINUE = "Continue",
}

type PlayersContext = {
  id: "players";
  value: string;
};

export const playersContextId: PlayersContext["id"] = "players";

export function gameIsFinished(result: Result): boolean {
  if (Object.keys(result.players).length === 2) {
    return true;
  }
  return false;
}

export default {
  setup() {
    return {
      activeContext: ref<undefined | string>(undefined),
      resultsRegistered: ref<boolean>(false),
      resultsSubscription: ref<Subscription | undefined>(undefined),
      buttonText: ref<string>("Start"),
    };
  },

  async mounted() {
    const { players, activeContext, storedContext } = await db.transaction(
      "r",
      [db.players, db.context],
      async () => {
        const definedPlayers = (await db.players.toArray()).map((p) => p.name);
        const activeContext = isPlayable(definedPlayers.length)
          ? definedPlayers.join("-") // players are sorted
          : undefined;
        const storedContext = <PlayersContext | undefined>(
          await db.context.get(playersContextId)
        );

        return {
          players: definedPlayers,
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
      this.unsubscribeResults();

      const next = await getNext(db);

      await db.transaction("rw", [db.playing, db.context], async () => {
        await db.playing.clear();
        for (const part of next) {
          await db.playing.add(part);
        }
        await db.context.put({
          id: playersContextId,
          value: this.activeContext,
        });
      });

      await this.subscribeToResults();
    },
    async subscribeToResults() {
      this.buttonText = "Continue";
      this.resultsRegistered = false;

      const gamesToWatch = (await db.playing.toArray())
        .filter((g) => g.type === "single" || g.type === "double")
        .map((p) => p.id!);

      const observer = from(
        liveQuery(() =>
          db.results.where("playing").anyOf(gamesToWatch).toArray()
        )
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
