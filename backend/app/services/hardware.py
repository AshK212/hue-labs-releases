"""Hardware detection.

Goal: gather OS / CPU / memory / GPU in a cross-platform-friendly way and turn
it into plain language for non-technical users. We rely on `psutil` and the
standard library, plus a best-effort GPU probe that never crashes the request.
"""

from __future__ import annotations

import platform
import subprocess

import psutil

from app.schemas import GpuInfo, HardwareInfo


def _bytes_to_gb(value: int) -> float:
    return round(value / (1024 ** 3), 1)


def _cpu_name() -> str:
    """Best-effort human-readable CPU name across platforms."""
    system = platform.system()
    try:
        if system == "Windows":
            # Read the friendly name straight from the registry. This is reliable
            # on modern Windows 11, where `wmic` has been removed.
            import winreg  # Windows-only stdlib module

            with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0",
            ) as key:
                name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
                if name:
                    return name.strip()
        elif system == "Darwin":
            out = subprocess.run(
                ["sysctl", "-n", "machdep.cpu.brand_string"],
                capture_output=True, text=True, timeout=5,
            )
            if out.stdout.strip():
                return out.stdout.strip()
        elif system == "Linux":
            with open("/proc/cpuinfo", "r", encoding="utf-8") as fh:
                for line in fh:
                    if line.lower().startswith("model name"):
                        return line.split(":", 1)[1].strip()
    except Exception:
        pass
    # Fallback: still useful, e.g. "AMD64 / Intel64 Family 6 ...".
    return platform.processor() or platform.machine() or "Unknown CPU"


def _is_apple_silicon() -> bool:
    return platform.system() == "Darwin" and platform.machine() in ("arm64", "aarch64")


def _detect_gpus() -> list[GpuInfo]:
    """Best-effort GPU probe. Never raises — returns [] if nothing is found."""
    gpus: list[GpuInfo] = []

    # 1) NVIDIA via nvidia-smi (most reliable when present).
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5,
        )
        if out.returncode == 0:
            for line in out.stdout.splitlines():
                parts = [p.strip() for p in line.split(",")]
                if parts and parts[0]:
                    vram = None
                    if len(parts) > 1:
                        try:
                            vram = round(float(parts[1]) / 1024, 1)  # MiB -> GB
                        except ValueError:
                            vram = None
                    gpus.append(GpuInfo(name=parts[0], vendor="NVIDIA", vram_gb=vram))
    except Exception:
        pass

    if gpus:
        return gpus

    # 2) Apple Silicon integrated GPU.
    if _is_apple_silicon():
        gpus.append(GpuInfo(name="Apple integrated GPU", vendor="Apple", vram_gb=None))
        return gpus

    # 3) Windows generic probe (covers AMD / Intel / NVIDIA without drivers loaded).
    # Uses PowerShell CIM since `wmic` is removed on modern Windows 11.
    if platform.system() == "Windows":
        try:
            out = subprocess.run(
                [
                    "powershell", "-NoProfile", "-Command",
                    "Get-CimInstance Win32_VideoController | "
                    "Select-Object -ExpandProperty Name",
                ],
                capture_output=True, text=True, timeout=8,
            )
            for line in out.stdout.splitlines():
                name = line.strip()
                if not name:
                    continue
                vendor = "Unknown"
                lname = name.lower()
                if "nvidia" in lname:
                    vendor = "NVIDIA"
                elif "amd" in lname or "radeon" in lname:
                    vendor = "AMD"
                elif "intel" in lname:
                    vendor = "Intel"
                gpus.append(GpuInfo(name=name, vendor=vendor, vram_gb=None))
        except Exception:
            pass

    return gpus


def _build_summary(info: HardwareInfo) -> str:
    """A single friendly sentence the UI can show without any jargon."""
    gpu_text = "no dedicated GPU detected"
    if info.gpus:
        primary = info.gpus[0]
        gpu_text = f"{primary.name}"
        if primary.vram_gb:
            gpu_text += f" ({primary.vram_gb} GB)"
    chip = "Apple Silicon" if info.is_apple_silicon else info.cpu_name
    return (
        f"{chip} with {info.memory_total_gb} GB of memory, running "
        f"{info.os_name}. Graphics: {gpu_text}."
    )


def detect_hardware() -> HardwareInfo:
    vmem = psutil.virtual_memory()
    info = HardwareInfo(
        os_name=f"{platform.system()} {platform.release()}".strip(),
        os_version=platform.version(),
        cpu_name=_cpu_name(),
        cpu_cores_physical=psutil.cpu_count(logical=False) or 0,
        cpu_cores_logical=psutil.cpu_count(logical=True) or 0,
        memory_total_gb=_bytes_to_gb(vmem.total),
        memory_available_gb=_bytes_to_gb(vmem.available),
        gpus=_detect_gpus(),
        is_apple_silicon=_is_apple_silicon(),
    )
    info.summary = _build_summary(info)
    return info
