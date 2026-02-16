import hre from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;

describe("RestrictedToken", function () {
  async function deployFixture() {
    const [owner, alice, bob, carol] = await ethers.getSigners();

    const AllowlistRegistry = await ethers.getContractFactory("AllowlistRegistry");
    const registry = await AllowlistRegistry.deploy();
    await registry.waitForDeployment();

    const RestrictedToken = await ethers.getContractFactory("RestrictedToken");
    const token = await RestrictedToken.deploy("Test Token", "TST", await registry.getAddress());
    await token.waitForDeployment();

    await token.mint(alice.address, ethers.parseEther("1000"));

    return { registry, token, owner, alice, bob, carol };
  }

  describe("Allowlist enforcement", function () {
    it("blocks transfer if recipient is not allowlisted", async function () {
      const { registry, token, alice, bob } = await deployFixture();
      await registry.setAllowed(alice.address, true);

      await expect(
        token.connect(alice).transfer(bob.address, ethers.parseEther("100"))
      ).to.be.revertedWith("RestrictedToken: recipient not allowlisted");
    });

    it("blocks transfer if sender is not allowlisted", async function () {
      const { registry, token, alice, bob } = await deployFixture();
      await registry.setAllowed(bob.address, true);

      await expect(
        token.connect(alice).transfer(bob.address, ethers.parseEther("100"))
      ).to.be.revertedWith("RestrictedToken: sender not allowlisted");
    });

    it("allows transfer when both sender and recipient are allowlisted", async function () {
      const { registry, token, alice, bob } = await deployFixture();
      await registry.batchSetAllowed([alice.address, bob.address], true);

      await token.connect(alice).transfer(bob.address, ethers.parseEther("100"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("100"));
    });

    it("allows transfer when allowlist is disabled", async function () {
      const { token, alice, bob } = await deployFixture();
      await token.setAllowlistRequired(false);

      await token.connect(alice).transfer(bob.address, ethers.parseEther("100"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Lockup enforcement", function () {
    it("blocks transfers during lockup", async function () {
      const { registry, token, alice, bob } = await deployFixture();
      await registry.batchSetAllowed([alice.address, bob.address], true);

      const futureTime = (await time.latest()) + 86400;
      await token.setGlobalLockupEndsAt(futureTime);

      await expect(
        token.connect(alice).transfer(bob.address, ethers.parseEther("100"))
      ).to.be.revertedWith("RestrictedToken: global lockup active");
    });

    it("allows transfers after lockup expires", async function () {
      const { registry, token, alice, bob } = await deployFixture();
      await registry.batchSetAllowed([alice.address, bob.address], true);

      const futureTime = (await time.latest()) + 86400;
      await token.setGlobalLockupEndsAt(futureTime);

      await time.increase(86401);

      await token.connect(alice).transfer(bob.address, ethers.parseEther("100"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Pause enforcement", function () {
    it("blocks transfers when paused", async function () {
      const { registry, token, alice, bob } = await deployFixture();
      await registry.batchSetAllowed([alice.address, bob.address], true);
      await token.pause();

      await expect(
        token.connect(alice).transfer(bob.address, ethers.parseEther("100"))
      ).to.be.revertedWith("RestrictedToken: paused");
    });

    it("allows transfers after unpausing", async function () {
      const { registry, token, alice, bob } = await deployFixture();
      await registry.batchSetAllowed([alice.address, bob.address], true);
      await token.pause();
      await token.unpause();

      await token.connect(alice).transfer(bob.address, ethers.parseEther("100"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Mint and burn bypass", function () {
    it("allows minting without allowlist", async function () {
      const { token, carol } = await deployFixture();
      await token.mint(carol.address, ethers.parseEther("500"));
      expect(await token.balanceOf(carol.address)).to.equal(ethers.parseEther("500"));
    });

    it("allows burning without allowlist", async function () {
      const { token, alice } = await deployFixture();
      await token.burn(alice.address, ethers.parseEther("100"));
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("900"));
    });
  });
});
