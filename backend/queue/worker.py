import asyncio
import logging
from sqlalchemy.orm import Session
from backend.database.db import SessionLocal
from backend.agents.simulator import SimulatorEngine
from backend.database.models import Scan

logger = logging.getLogger("buggi.queue")

class JobQueue:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(JobQueue, cls).__new__(cls)
            cls._instance.queue = asyncio.Queue()
        return cls._instance

    async def enqueue(self, scan_id: str):
        await self.queue.put(scan_id)
        logger.info(f"Enqueued scan job: {scan_id}")

    async def get(self) -> str:
        return await self.queue.get()

    def task_done(self):
        self.queue.task_done()

# Singleton Instance
job_queue = JobQueue()

async def background_worker():
    """Loops indefinitely, consuming jobs from the asyncio queue and running simulations."""
    logger.info("Background job queue worker started.")
    while True:
        try:
            scan_id = await job_queue.get()
            logger.info(f"Worker picked up scan job: {scan_id}")
            
            # Open database session for this run
            db: Session = SessionLocal()
            try:
                # Update status
                scan = db.query(Scan).filter(Scan.id == scan_id).first()
                if scan:
                    simulator = SimulatorEngine(db, scan_id)
                    await simulator.run()
                else:
                    logger.error(f"Scan job {scan_id} picked up but not found in DB.")
            except Exception as e:
                logger.error(f"Error executing scan job {scan_id}: {e}", exc_info=True)
                # Fail the scan in database
                try:
                    scan = db.query(Scan).filter(Scan.id == scan_id).first()
                    if scan:
                        scan.status = "failed"
                        db.commit()
                except Exception as db_err:
                    logger.error(f"Failed to set status to failed: {db_err}")
            finally:
                db.close()
                job_queue.task_done()
        except asyncio.CancelledError:
            logger.info("Background job worker cancelled.")
            break
        except Exception as e:
            logger.error(f"Unexpected error in background worker loop: {e}", exc_info=True)
            await asyncio.sleep(1)
