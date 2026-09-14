from pathlib import Path

(Path(__file__).parent / "data" / "raw").mkdir(parents=True, exist_ok=True)
(Path(__file__).parent / "data" / "processed").mkdir(parents=True, exist_ok=True)
(Path(__file__).parent / "artifacts").mkdir(parents=True, exist_ok=True)
