const login = async (req, res) => {
  try {
    res.redirect("/admin/login");
  } catch (error) {
    console.error(error.message + " user loadhome");
    res.render("500");
  }
};

const loadSignin = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    console.error(error.message + " user loadlogin");
    res.render("500");
  }
};

const verifySignIn = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (req.body.email === adminEmail && req.body.password === adminPassword) {
      req.session.admin = true;

      res.redirect("/admin/dashboard");
    } else {
      res.render("login", {
        errorMessage: "Invalid email or password",
      });
    }
  } catch (error) {
    console.error(error.message + " admin verify signin");
    res.render("500");
  }
};

const logout = async (req, res) => {
  try {
    req.session.admin = false;
    res.json({
      success: true,
    });
  } catch (error) {
    console.error(error.message + " admin logout");
    res.render("500");
  }
};

module.exports = {
  loadSignin,
  login,
  verifySignIn,
  logout,
};
