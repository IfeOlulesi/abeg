"""On-task backstop: detect replies that slipped into off-task code."""
from app.agent import _looks_offtask


def test_flags_code_fence():
    assert _looks_offtask("Sure! ```python\ndef reverse(head):\n    ...\n```")


def test_flags_bare_function_def():
    assert _looks_offtask("Here you go: def reverse_list(head): pass")


def test_allows_normal_food_reply():
    assert not _looks_offtask(
        "We've got Party Jollof Rice — ₦3,500 each, 1 in stock. How many would you like?"
    )


def test_allows_refusal():
    assert not _looks_offtask(
        "I only help with our food menu and orders — want to see the menu?"
    )
