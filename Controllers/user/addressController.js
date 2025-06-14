const Address = require("../../Models/addressModel");

const addAddress = async (req, res) => {
  try {
    const { name, phone, address, street, city, landmark, state, pincode } =
      req.body;

    const userId = req.userId;

    const addAddress = new Address({
      user: userId,
      name,
      phone,
      address,
      street,
      city,
      landmark,
      state,
      pincode,
    });

    await addAddress.save();

    res.json({
      success: true,
      address: addAddress,
      message: "Address added successfully",
    });
  } catch (error) {
    console.error("Error adding address:", error.message);
    res.json({
      success: false,
      message: "Error adding address",
    });
  }
};

const editAddress = async (req, res) => {
  try {
    const {
      addressId,
      name,
      phone,
      address,
      street,
      city,
      landmark,
      state,
      pincode,
    } = req.body;

    const updateAddress = await Address.findOneAndUpdate(
      { _id: addressId },
      { name, phone, address, street, city, landmark, state, pincode },
      { new: true }
    );

    if (!updateAddress) {
      return res.json({
        success: false,
        message: "Address not found",
      });
    }

    res.json({
      success: true,
      address: updateAddress,
      message: "Address updated successfully",
    });
  } catch (error) {
    console.error("Error finding address:", error.message);
    res.json({
      success: false,
      message: "Error finding address",
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.body.addressId;
    const deleteAddress = await Address.findOneAndDelete({ _id: addressId });

    if (!deleteAddress) {
      return res.json({
        success: false,
        message: "Address not found",
      });
    }
    res.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error finding address:", error.message);
    res.json({
      success: false,
      message: "Error finding address",
    });
  }
};

module.exports = {
  addAddress,
  editAddress,
  deleteAddress,
};
