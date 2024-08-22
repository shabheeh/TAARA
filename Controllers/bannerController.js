const Banner = require('../Models/bannerModel')


// -----banners----->

const banners = async ( req, res ) => {
    try {
        const banners = await Banner.find()
        res.render('banners',{
            banners,
        })
    } catch (error) {
        console.error('error loading banners', error.message)
    }
}

// -----load edit banner---->
const loadEditBanner = async (req, res) => {
  try {
    const id = req.params.id;
    const banner = await Banner.findById(id);
    res.render("editBanner", {
      banner,
    });
  } catch (error) {
    console.error("error loading edit banner", error.message);
  }
};


// -----edit Banner------>

const editBanner = async ( req, res ) => {

    try {
      
      const { id, title, link, description} = req.body

      let image;

    if (req.file) {
      image = req.file.filename; 
    } else {
      image = req.body.existingImage;
    }


      const updateBanner = await Banner.findByIdAndUpdate(id, {
  
          title,
          description,
          link,
          image
          }, { new: true,});
  
          if (!updateBanner) {
            return res.json({
              success: false,
              message: "Banner not found",
            });
          }
 
          res.json({
            id,
            success: true,
            message: "Banner updated successfully",
          });
        } catch (error) {
          console.error("Error Editing Banner", error.message);
        
          res.json({
            success: false,
            message: "An error occurred while updating the Banner",
          });
        }
  }

module.exports = {
    banners,
    loadEditBanner,
    editBanner,
}