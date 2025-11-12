from app.security.permissions import (
    ROLE_PERMISSIONS,
    check_permission,
    can_role_write,
    can_role_view_sensitive,
)


def test_permissions_matrix():
    assert check_permission("superadmin", "consents", "write")
    assert check_permission("admin", "orgs", "add_user")
    assert not check_permission("viewer", "orgs", "add_user")
    assert can_role_write("manager") is True
    assert can_role_view_sensitive("viewer") is False
    assert can_role_view_sensitive("admin") is True

    print("✅ Permission matrix verified successfully")

