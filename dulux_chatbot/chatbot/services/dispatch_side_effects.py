from contextlib import contextmanager
from contextvars import ContextVar
from typing import Callable, Iterator


SideEffect = Callable[[], None]
_DISPATCH_SIDE_EFFECTS: ContextVar[list[SideEffect] | None] = ContextVar("dispatch_side_effects", default=None)


@contextmanager
def collect_dispatch_side_effects(side_effects: list[SideEffect]) -> Iterator[None]:
    token = _DISPATCH_SIDE_EFFECTS.set(side_effects)
    try:
        yield
    finally:
        _DISPATCH_SIDE_EFFECTS.reset(token)


def defer_dispatch_side_effect(side_effect: SideEffect) -> None:
    side_effects = _DISPATCH_SIDE_EFFECTS.get()
    if side_effects is None:
        side_effect()
        return
    side_effects.append(side_effect)
