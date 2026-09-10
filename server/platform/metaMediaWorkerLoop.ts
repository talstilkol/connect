import { META_MEDIA_TASK_POLICY } from "../meta/metaMediaTasks.ts";

// Independent from the shared campaign scheduler lease. Upload and inspection
// processes must both progress; row claims coordinate each media queue.
export function createMetaMediaWorkerLoop(dependencies: Readonly<{
  run: (stopping: () => boolean) => Promise<void>;
  recordFailure: () => void;
  timers?: Readonly<{ schedule: (work: () => Promise<void>, delayMs: number) => ReturnType<typeof setTimeout>; cancel: (timer: ReturnType<typeof setTimeout>) => void }>;
}>) {
  const timers=dependencies.timers??{schedule:(work:()=>Promise<void>,delay:number)=>setTimeout(()=>{void work();},delay),cancel:clearTimeout};
  let started=false,closed=false,timer:ReturnType<typeof setTimeout>|null=null,active:Promise<void>|null=null;
  const report=()=>{try{dependencies.recordFailure();}catch{/* Telemetry cannot escape a timer callback. */}};
  async function tick(){
    timer=null;if(closed||active!==null)return;
    active=(async()=>{try{await dependencies.run(()=>closed);}catch{report();}})();
    try{await active;}finally{active=null;if(!closed){try{timer=timers.schedule(tick,META_MEDIA_TASK_POLICY.pollMs);}catch{report();}}}
  }
  return Object.freeze({
    async start(){if(closed)throw new Error("Media worker is closed");if(started)return;started=true;try{timer=timers.schedule(tick,0);}catch{started=false;throw new Error("Media worker timer failed");}},
    async close(){closed=true;if(timer!==null){timers.cancel(timer);timer=null;}if(active!==null)await active;},
  });
}
